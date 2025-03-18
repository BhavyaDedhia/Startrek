import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        await connectDB();
        const { name, email, password, mobile, aadhar, faceData } = await req.json();

        // Check for required fields
        if (!name || !email || !password || !mobile || !aadhar || !faceData) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }

        // Check if user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email already exists" },
                { status: 409 }
            );
        }

        // Check if user with this Aadhar already exists
        const existingAadhar = await User.findOne({ aadhar });
        if (existingAadhar) {
            return NextResponse.json(
                { message: "User with this Aadhar number already exists" },
                { status: 409 }
            );
        }

        // Check if user with this mobile already exists
        const existingMobile = await User.findOne({ mobile });
        if (existingMobile) {
            return NextResponse.json(
                { message: "User with this mobile number already exists" },
                { status: 409 }
            );
        }

        // In a real system, here you would validate the face image against Aadhar database
        // This is a simplified demo version that just accepts the face image

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            mobile,
            aadhar,
            faceData
        });

        await newUser.save();

        // Return user data (except password)
        return NextResponse.json({
            message: "User registered successfully",
            userId: newUser._id,
            name: newUser.name,
            email: newUser.email
        }, { status: 201 });

    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { message: "Error during registration", error: error.message },
            { status: 500 }
        );
    }
} 