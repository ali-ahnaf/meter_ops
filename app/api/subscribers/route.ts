import { NextResponse } from "next/server";
import { initializeDatabase, subscriberRepo } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };

    if (!body.email?.trim()) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await initializeDatabase();
    const repository = subscriberRepo();
    const existingSubscriber = await repository.findOne({
      where: { email: body.email.trim().toLowerCase() },
    });

    if (existingSubscriber) {
      return NextResponse.json({ message: "Subscriber already exists." }, { status: 409 });
    }

    const subscriber = repository.create({
      email: body.email.trim().toLowerCase(),
    });

    await repository.save(subscriber);

    return NextResponse.json({ message: "Subscriber created successfully." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create subscriber:", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
