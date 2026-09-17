import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo1234!";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Sembrando datos demo...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [admin, sales, tech, cashier, supervisor] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@appleerp.test" },
      update: {},
      create: { name: "Ana Administradora", email: "admin@appleerp.test", passwordHash, role: "ADMIN" },
    }),
    prisma.user.upsert({
      where: { email: "ventas@appleerp.test" },
      update: {},
      create: { name: "Vicente Ventas", email: "ventas@appleerp.test", passwordHash, role: "SALES" },
    }),
    prisma.user.upsert({
      where: { email: "tecnico@appleerp.test" },
      update: {},
      create: { name: "Tomas Tecnico", email: "tecnico@appleerp.test", passwordHash, role: "TECH" },
    }),
    prisma.user.upsert({
      where: { email: "caja@appleerp.test" },
      update: {},
      create: { name: "Carla Caja", email: "caja@appleerp.test", passwordHash, role: "CASHIER" },
    }),
    prisma.user.upsert({
      where: { email: "supervisor@appleerp.test" },
      update: {},
      create: { name: "Sergio Supervisor", email: "supervisor@appleerp.test", passwordHash, role: "SUPERVISOR" },
    }),
  ]);

  const location = await prisma.location.upsert({
    where: { id: "loc-palermo" },
    update: {},
    create: { id: "loc-palermo", name: "Local Palermo", isDefault: true },
  });

  await Promise.all([
    prisma.cashAccount.upsert({
      where: { id: "cash-usd" },
      update: {},
      create: { id: "cash-usd", name: "Efectivo USD", currency: "USD", kind: "CASH" },
    }),
    prisma.cashAccount.upsert({
      where: { id: "cash-ars" },
      update: {},
      create: { id: "cash-ars", name: "Efectivo ARS", currency: "ARS", kind: "CASH" },
    }),
    prisma.cashAccount.upsert({
      where: { id: "bank-ars" },
      update: {},
      create: { id: "bank-ars", name: "Banco (transferencias)", currency: "ARS", kind: "BANK" },
    }),
  ]);

  await prisma.exchangeRate.upsert({
    where: { date: new Date(new Date().toDateString()) },
    update: {},
    create: { date: new Date(new Date().toDateString()), usdToArs: 1050 },
  });

  const consignor = await prisma.customer.upsert({
    where: { id: "cust-consignor-1" },
    update: {},
    create: {
      id: "cust-consignor-1",
      firstName: "Marcos",
      lastName: "Fernandez",
      phone: "+54 9 11 5555-0101",
      whatsapp: "+54 9 11 5555-0101",
      email: "marcos.fernandez@example.com",
    },
  });

  await prisma.customer.upsert({
    where: { id: "cust-buyer-1" },
    update: {},
    create: {
      id: "cust-buyer-1",
      firstName: "Lucia",
      lastName: "Gomez",
      phone: "+54 9 11 5555-0202",
      email: "lucia.gomez@example.com",
    },
  });

  const productDefs = [
    { key: "iphone11-64", category: "IPHONE", brand: "Apple", model: "iPhone 11", storageGb: 64 },
    { key: "iphone13pm-256", category: "IPHONE", brand: "Apple", model: "iPhone 13 Pro Max", storageGb: 256 },
    { key: "iphone14pm-256", category: "IPHONE", brand: "Apple", model: "iPhone 14 Pro Max", storageGb: 256 },
    { key: "iphone15pm-256", category: "IPHONE", brand: "Apple", model: "iPhone 15 Pro Max", storageGb: 256 },
    { key: "iphone16-128", category: "IPHONE", brand: "Apple", model: "iPhone 16", storageGb: 128 },
    { key: "iphone16-256", category: "IPHONE", brand: "Apple", model: "iPhone 16", storageGb: 256 },
    { key: "iphone17pro-512", category: "IPHONE", brand: "Apple", model: "iPhone 17 Pro", storageGb: 512 },
    { key: "macbookair-m2", category: "MAC", brand: "Apple", model: "MacBook Air M2", storageGb: 256 },
    { key: "ipad-10", category: "IPAD", brand: "Apple", model: "iPad (10a generacion)", storageGb: 64 },
    { key: "watch-s9", category: "WATCH", brand: "Apple", model: "Apple Watch Series 9", storageGb: null },
    { key: "airpods-pro2", category: "AIRPODS", brand: "Apple", model: "AirPods Pro 2", storageGb: null },
    { key: "funda-iphone", category: "ACCESSORY", brand: "Apple", model: "Funda de silicona iPhone", storageGb: null },
  ] as const;

  const products = new Map<string, Awaited<ReturnType<typeof prisma.product.upsert>>>();
  for (const def of productDefs) {
    const product = await prisma.product.upsert({
      where: { id: `prod-${def.key}` },
      update: {},
      create: {
        id: `prod-${def.key}`,
        category: def.category,
        brand: def.brand,
        model: def.model,
        storageGb: def.storageGb ?? undefined,
        isSerialized: def.category !== "ACCESSORY",
      },
    });
    products.set(def.key, product);
  }

  const unitSeeds = [
    { key: "iphone11-64", imei: "358210001111011", condition: "GOOD", battery: 87, cost: 130, price: 190, owner: "COMPANY", age: 10 },
    { key: "iphone13pm-256", imei: "358210001111013", condition: "LIKE_NEW", battery: 92, cost: 380, price: 500, owner: "COMPANY", age: 55 },
    { key: "iphone14pm-256", imei: "358210001111014", condition: "GOOD", battery: 89, cost: 480, price: 650, owner: "COMPANY", age: 5 },
    { key: "iphone15pm-256", imei: "358210001111015", condition: "LIKE_NEW", battery: 100, cost: 780, price: 980, owner: "COMPANY", age: 2 },
    { key: "iphone16-128", imei: "358210001111016", condition: "NEW", battery: 100, cost: 850, price: 999, owner: "COMPANY", age: 1 },
    { key: "iphone16-256", imei: "358210001111017", condition: "NEW", battery: 100, cost: 950, price: 1099, owner: "COMPANY", age: 3 },
    { key: "iphone17pro-512", imei: "358210001111018", condition: "NEW", battery: 100, cost: 1500, price: 1799, owner: "COMPANY", age: 1 },
    { key: "macbookair-m2", serial: "C02ABCDEF001", condition: "GOOD", battery: null, cost: 750, price: 950, owner: "COMPANY", age: 20 },
    { key: "ipad-10", serial: "F2LABCDEF002", condition: "LIKE_NEW", battery: 96, cost: 300, price: 399, owner: "CONSIGNMENT", age: 15 },
    { key: "watch-s9", serial: "H9WABCDEF003", condition: "GOOD", battery: 90, cost: 220, price: 320, owner: "COMPANY", age: 60 },
    { key: "airpods-pro2", serial: "GX2ABCDEF004", condition: "NEW", battery: null, cost: 150, price: 220, owner: "COMPANY", age: 4 },
  ] as const;

  for (const seed of unitSeeds) {
    const product = products.get(seed.key)!;
    const unitId = `unit-${seed.key}`;
    const createdAt = daysAgo(seed.age);

    const unit = await prisma.inventoryUnit.upsert({
      where: { id: unitId },
      update: {},
      create: {
        id: unitId,
        productId: product.id,
        locationId: location.id,
        imei: "imei" in seed ? seed.imei : undefined,
        serialNumber: "serial" in seed ? seed.serial : undefined,
        condition: seed.condition,
        batteryPct: seed.battery ?? undefined,
        isNew: seed.condition === "NEW",
        cost: seed.cost,
        listPrice: seed.price,
        ownerType: seed.owner,
        status: "AVAILABLE",
        createdAt,
        updatedAt: createdAt,
      },
    });

    await prisma.inventoryUnitStatusEvent.upsert({
      where: { id: `event-${unitId}-created` },
      update: {},
      create: {
        id: `event-${unitId}-created`,
        inventoryUnitId: unit.id,
        toStatus: "AVAILABLE",
        changedByUserId: admin.id,
        note: "Alta demo",
        createdAt,
      },
    });

    if (seed.owner === "CONSIGNMENT") {
      await prisma.consignment.upsert({
        where: { inventoryUnitId: unit.id },
        update: {},
        create: {
          inventoryUnitId: unit.id,
          ownerCustomerId: consignor.id,
          commissionPct: 15,
          minPrice: seed.price * 0.9,
          termStartAt: createdAt,
          status: "ACTIVE",
        },
      });
    }
  }

  const expenseCategoryNames = [
    "Alquiler",
    "Sueldos",
    "Publicidad",
    "Logistica",
    "Insumos",
    "Comisiones",
    "Impuestos",
    "Servicios",
    "Software",
    "Otros",
  ];
  for (const name of expenseCategoryNames) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.supplier.upsert({
    where: { id: "sup-techimport" },
    update: {},
    create: {
      id: "sup-techimport",
      name: "TechImport SRL",
      contactName: "Roberto Diaz",
      phone: "+54 9 11 4444-5555",
      email: "ventas@techimport.example.com",
    },
  });

  console.log("Listo. Usuarios demo (misma contrasena para todos):");
  for (const user of [admin, sales, tech, cashier, supervisor]) {
    console.log(`  ${user.email} / ${DEMO_PASSWORD}  (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
