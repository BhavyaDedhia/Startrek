import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
    try {
        await connectDB();
        const { faceData } = await req.json();

        if (!faceData) {
            return NextResponse.json(
                { message: "Face data is required" },
                { status: 400 }
            );
        }

        // In a real system, you would:
        // 1. Extract facial features from the captured image
        // 2. Compare with stored faces in the database using a face recognition algorithm
        // 3. Find the closest match above a certain confidence threshold

        // For demo purposes, we'll just find a user with any faceData
        // In a production system, you would use a proper face recognition system

        const users = await User.find({ faceData: { $exists: true, $ne: null } });
        
        if (users.length === 0) {
            return NextResponse.json(
                { message: "No registered users with facial recognition" },
                { status: 404 }
            );
        }

        // Simulate facial recognition with a mock verification
        // In a real system, you would calculate similarity scores and find the best match
        // For this demo, we'll just simulate a successful login with the first user who has face data

        const user = users[0];
        
        // In a real system, you would validate the face match here
        // const isMatch = await compareFaces(faceData, user.faceData);
        const isMatch = true; // For demo purposes
        
        if (!isMatch) {
            return NextResponse.json(
                { message: "Face recognition failed. Please try again." },
                { status: 401 }
            );
        }

        // Return user information without sending the password
        return NextResponse.json({
            message: "Login successful",
            userId: user._id,
            name: user.name,
            email: user.email
        }, { status: 200 });

    } catch (error) {
        console.error("Face login error:", error);
        return NextResponse.json(
            { message: "Error during face login", error: error.message },
            { status: 500 }
        );
    }
} 