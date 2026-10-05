import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const GET = async() =>{
  const start = Date.now();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - start;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          application: "healthy",
          database: "healthy",
        },
        responseTime: `${responseTime}ms`,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("HEALTH_CHECK_ERROR:", error);

    const responseTime = Date.now() - start;

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          application: "healthy",
          database: "unhealthy",
        },
        responseTime: `${responseTime}ms`,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}