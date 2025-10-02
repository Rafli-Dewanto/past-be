import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seeding...");

  try {
    // Check if superadmin already exists
    const existingSuperadmin = await prisma.user.findFirst({
      where: {
        role: "SUPERADMIN",
      },
    });

    if (existingSuperadmin) {
      console.log("✅ Superadmin user already exists");
      console.log(`   Email: ${existingSuperadmin.email}`);
      return;
    }

    // Create superadmin user
    const hashedPassword = await bcrypt.hash("superadmin123", 10);

    const superadmin = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "superadmin@pusatandalan.com",
        password: hashedPassword,
        role: "SUPERADMIN",
      },
    });

    console.log("✅ Created superadmin user:");
    console.log(`   ID: ${superadmin.id}`);
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Role: ${superadmin.role}`);
    console.log("   Password: superadmin123");

    // Optionally create some sample blogs
    console.log("🌱 Creating sample blogs...");

    const blog1 = await prisma.blog.create({
      data: {
        title: "Welcome to PusatAndalan Blog",
        content:
          "This is the first blog post on our platform. We are excited to share our thoughts and insights with you. Stay tuned for more amazing content!",
        thumbnail: "https://via.placeholder.com/800x600.png?text=Welcome+Blog",
        isPublished: true,
        userId: superadmin.id,
      },
    });

    const blog2 = await prisma.blog.create({
      data: {
        title: "Getting Started with Our API",
        content:
          "Learn how to use our blog management API. This comprehensive guide will walk you through authentication, creating blogs, and managing your content effectively.",
        thumbnail: "https://via.placeholder.com/800x600.png?text=API+Guide",
        isPublished: true,
        userId: superadmin.id,
      },
    });

    const blog3 = await prisma.blog.create({
      data: {
        title: "Draft: Upcoming Features",
        content:
          "We have some exciting features in development that will enhance your blogging experience. This post will be updated as we progress.",
        thumbnail: "https://via.placeholder.com/800x600.png?text=Coming+Soon",
        isPublished: false,
        userId: superadmin.id,
      },
    });

    console.log("✅ Created sample blogs:");
    console.log(`   - ${blog1.title} (Published)`);
    console.log(`   - ${blog2.title} (Published)`);
    console.log(`   - ${blog3.title} (Draft)`);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("🎉 Seeding completed successfully!");
  })
  .catch(async (e) => {
    console.error("💥 Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
