import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Removing seeded demo accounts (if present)...');

  const demoEmails = [
    process.env.DEMO_HOTEL_EMAIL || 'hotel@viatrips.com',
    process.env.DEMO_BUNDLE_EMAIL || 'bundle@viatrips.com',
  ];

  for (const email of demoEmails) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      console.log(`No demo user found for ${email}`);
      continue;
    }

    console.log(`Cleaning demo content for user: ${email} (keeping user record)`);

    // Find related IDs
    const hotels = await prisma.hotel.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const hotelIds = hotels.map((h) => h.id);

    const bundles = await prisma.bundle.findMany({ where: { creatorId: user.id }, select: { id: true } });
    const bundleIds = bundles.map((b) => b.id);

    const rooms = await prisma.room.findMany({ where: { hotelId: { in: hotelIds } }, select: { id: true } });
    const roomIds = rooms.map((r) => r.id);

    // Delete bookings owned by user or referencing user's hotels/bundles/rooms
    const bookingDelete = await prisma.booking.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          ...(hotelIds.length ? [{ hotelId: { in: hotelIds } }] : []),
          ...(bundleIds.length ? [{ bundleId: { in: bundleIds } }] : []),
          ...(roomIds.length ? [{ roomId: { in: roomIds } }] : []),
        ],
      },
    });
    console.log(`Deleted ${bookingDelete.count} bookings related to ${email}`);

    // Delete rooms
    if (roomIds.length) {
      const roomDel = await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
      console.log(`Deleted ${roomDel.count} rooms for ${email}`);
    }

    // Delete hotels
    if (hotelIds.length) {
      const hotelDel = await prisma.hotel.deleteMany({ where: { id: { in: hotelIds } } });
      console.log(`Deleted ${hotelDel.count} hotels for ${email}`);
    }

    // Delete bundles (cascade should remove days/items)
    if (bundleIds.length) {
      const bundleDel = await prisma.bundle.deleteMany({ where: { id: { in: bundleIds } } });
      console.log(`Deleted ${bundleDel.count} bundles for ${email}`);
    }

    // Delete KYC documents
    const kycDel = await prisma.kycDocument.deleteMany({ where: { userId: user.id } });
    console.log(`Deleted ${kycDel.count} KYC documents for ${email}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
