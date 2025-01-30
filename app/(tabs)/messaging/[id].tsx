import React, { useEffect } from "react"
import { useLocalSearchParams } from "expo-router"

export default function MessagingPage() {
    const { id } = useLocalSearchParams();

    useEffect (() => {
        console.log(`User navigated to MessagingPage with ID: ${id}`);

    }, [id]);

    return
}