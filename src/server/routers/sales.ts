import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc";
import { can } from "@/lib/auth/permissions";
import { ProductCategory, ConditionGrade } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const SaleItemInput = z.object({
  kind: z.enum(["unit", "lot"]),
  id: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const PaymentInput = z.object({
  method: asEnum(["CASH", "TRANSFER", "CARD", "TRADE_IN", "OTHER"]),
  currency: asEnum(["USD", "ARS"]),
  amount: z.number().positive(),
  cashAccountId: z.string().optional(),
});

const TradeInInput = z.object({
  category: asEnum(Object.values(ProductCategory)),
  brand: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().optional(),
  storageGb: z.number().int().positive().optional(),
  color: z.string().optional(),
  condition: asEnum(Object.values(ConditionGrade)),
  batteryPct: z.number().int().min(0).max(100).optional(),
  imei: z.string().optional(),
  serialNumber: z.string().optional(),
  appraisedValue: z.number().nonnegative(),
  locationId: z.string(),
});

const CreateSaleInput = z.object({
  customerId: z.string().optional(),
  currency: asEnum(["USD", "ARS"]),
  discount: z.number().nonnegative().default(0),
  items: z.array(SaleItemInput).min(1),
  payments: z.array(PaymentInput).min(1),
  tradeIn: TradeInInput.optional(),
});

async function convertToSaleCurrency(
  amount: number,
  from: "USD" | "ARS",
  to: "USD" | "ARS",
  usdToArs: number,
) {
  if (from === to) return amount;
  return from === "USD" ? amount * usdToArs : amount / usdToArs;
}

export const salesRouter = router({
  create: protectedProcedure.input(CreateSaleInput).mutation(async ({ ctx, input }) => {
    if (!can(ctx.session.role, "MANAGE_SALES")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tenes permiso para registrar ventas." });
    }

    const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = Math.max(0, subtotal - input.discount);

    const latestRate = await ctx.prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } });
    const usdToArs = latestRate?.usdToArs.toNumber() ?? 1;

    const paymentsInSaleCurrency = await Promise.all(
      input.payments.map((p) => convertToSaleCurrency(p.amount, p.currency, input.currency, usdToArs)),
    );
    const paymentsTotal = paymentsInSaleCurrency.reduce((sum, v) => sum + v, 0);

    if (paymentsTotal + 0.01 < total) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Los pagos (${paymentsTotal.toFixed(2)}) no cubren el total de la venta (${total.toFixed(2)}).`,
      });
    }

    const saleId = await ctx.prisma.$transaction(async (tx) => {
      let costTotal = 0;
      // "Costo" a efectos de ganancia: para una unidad consignada, no tenemos costo propio
      // (se cargo en cost=0), pero el importe que le corresponde al consignante SI reduce
      // la ganancia real del negocio. Ahi el "costo" es el monto a liquidar (precio - comision).
      const effectiveUnitCost = new Map<string, number>();

      for (const item of input.items) {
        if (item.kind === "unit") {
          const unit = await tx.inventoryUnit.findUnique({
            where: { id: item.id },
            include: { consignment: true },
          });
          if (!unit || unit.status !== "AVAILABLE") {
            throw new TRPCError({ code: "CONFLICT", message: "Un equipo de la venta ya no esta disponible." });
          }

          let cost = unit.cost.toNumber();
          if (unit.ownerType === "CONSIGNMENT" && unit.consignment) {
            const commissionPct = unit.consignment.commissionPct.toNumber();
            cost = item.unitPrice * (1 - commissionPct / 100);
          }
          effectiveUnitCost.set(item.id, cost);
          costTotal += cost * item.quantity;
        } else {
          const lot = await tx.stockLot.findUnique({ where: { id: item.id } });
          if (!lot || lot.quantity < item.quantity) {
            throw new TRPCError({ code: "CONFLICT", message: "No hay stock suficiente de un accesorio de la venta." });
          }
          costTotal += lot.avgCost.toNumber() * item.quantity;
        }
      }

      const profitTotal = total - costTotal;

      const sale = await tx.sale.create({
        data: {
          customerId: input.customerId || null,
          currency: input.currency,
          exchangeRateId: latestRate?.id ?? null,
          subtotal,
          discount: input.discount,
          total,
          costTotal,
          profitTotal,
          soldByUserId: ctx.session.userId,
        },
      });

      for (const item of input.items) {
        if (item.kind === "unit") {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              inventoryUnitId: item.id,
              quantity: 1,
              unitPrice: item.unitPrice,
              unitCost: effectiveUnitCost.get(item.id) ?? 0,
            },
          });
          await tx.inventoryUnit.update({ where: { id: item.id }, data: { status: "SOLD" } });
          await tx.inventoryUnitStatusEvent.create({
            data: {
              inventoryUnitId: item.id,
              fromStatus: "AVAILABLE",
              toStatus: "SOLD",
              changedByUserId: ctx.session.userId,
              note: `Venta ${sale.id}`,
            },
          });

          const consignment = await tx.consignment.findUnique({ where: { inventoryUnitId: item.id } });
          if (consignment) {
            await tx.consignment.update({
              where: { id: consignment.id },
              data: { status: "PARTIALLY_SETTLED" },
            });
          }
        } else {
          const lot = await tx.stockLot.findUniqueOrThrow({ where: { id: item.id } });
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              stockLotId: item.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: lot.avgCost,
            },
          });
          await tx.stockLot.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      for (let i = 0; i < input.payments.length; i++) {
        const payment = input.payments[i];
        const createdPayment = await tx.payment.create({
          data: {
            saleId: sale.id,
            method: payment.method,
            currency: payment.currency,
            amount: payment.amount,
            exchangeRateId: latestRate?.id ?? null,
            cashAccountId: payment.cashAccountId || null,
          },
        });

        if (payment.cashAccountId && payment.method !== "TRADE_IN") {
          await tx.cashMovement.create({
            data: {
              cashAccountId: payment.cashAccountId,
              type: "IN",
              amount: payment.amount,
              currency: payment.currency,
              source: "SALE",
              referenceId: sale.id,
              description: `Cobro venta ${sale.id}`,
              createdByUserId: ctx.session.userId,
            },
          });
        }
        void createdPayment;
      }

      if (input.tradeIn) {
        const product = await tx.product.create({
          data: {
            category: input.tradeIn.category,
            brand: input.tradeIn.brand,
            model: input.tradeIn.model,
            variant: input.tradeIn.variant,
            storageGb: input.tradeIn.storageGb,
            color: input.tradeIn.color,
          },
        });

        const receivedUnit = await tx.inventoryUnit.create({
          data: {
            productId: product.id,
            locationId: input.tradeIn.locationId,
            imei: input.tradeIn.imei || null,
            serialNumber: input.tradeIn.serialNumber || null,
            condition: input.tradeIn.condition,
            batteryPct: input.tradeIn.batteryPct,
            isNew: false,
            cost: input.tradeIn.appraisedValue,
            listPrice: input.tradeIn.appraisedValue,
            status: "AVAILABLE",
            ownerType: "COMPANY",
            notes: `Recibido en plan canje, venta ${sale.id}`,
          },
        });

        await tx.inventoryUnitStatusEvent.create({
          data: {
            inventoryUnitId: receivedUnit.id,
            toStatus: "AVAILABLE",
            changedByUserId: ctx.session.userId,
            note: `Ingreso por plan canje (venta ${sale.id})`,
          },
        });

        await tx.tradeIn.create({
          data: {
            saleId: sale.id,
            receivedInventoryUnitId: receivedUnit.id,
            appraisedValue: input.tradeIn.appraisedValue,
            currency: input.currency,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: ctx.session.userId,
          action: "sale.create",
          entityType: "Sale",
          entityId: sale.id,
          after: { total, currency: input.currency, items: input.items.length },
        },
      });

      return sale.id;
    });

    return { id: saleId };
  }),
});
