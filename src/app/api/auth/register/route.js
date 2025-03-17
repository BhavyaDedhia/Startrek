import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongodb"; // Corrected path
import User from "../../../../models/User"; // Corrected path
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        await connectDB();
        const { name, email, password, faceData } = await req.json();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: "User already exists" }, { status: 400 });
        }

        // Hash password for security
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Create new user
        const newUser = new User({ name, email, password: hashedPassword, faceData });
        await newUser.save();

        return NextResponse.json({ message: "User registered successfully!" }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Error registering user", error }, { status: 500 });
    }
}
