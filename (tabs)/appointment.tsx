import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { createClient } from '@supabase/supabase-js';

/*
To do: 
- resolve error
- counselor's list
- availability of counselors
- once availability is clicked, display details
- contains book appointment
- interface of the upcoming appointment and a cancel / reschedule
- validations for appointment logic
*/

interface Availability {
    availability_schedule_id: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

interface RouteParams {
    counselorId: string;
}

interface AvailabilityCalendarProps {
    route: { params: RouteParams };
}

interface Day {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
}

export default function AvailabilityCalendar({ route }: AvailabilityCalendarProps) {
    const { counselorId } = route.params;
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const supabase = createClient(
        'https://ybpoanqhkokhdqucwchy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU'
    );

    useEffect(() => {
        if (selectedDate) {
            fetchAvailability();
        }
    }, [selectedDate]);

    async function fetchAvailability() {
        const { data, error } = await supabase
            .from('availability_schedules')
            .select('availability_schedule_id, start_time, end_time, is_available')
            .eq('counselor_id', counselorId)
            .eq('date', selectedDate);
        if (error) console.error(error);
        else setAvailability(data || []);
    }

    const handleDayPress = (day: Day) => {
        setSelectedDate(day.dateString);
    };

    return (
        <View style={styles.container}>
            <Calendar
                onDayPress={handleDayPress}
                markedDates={{
                    [selectedDate]: { selected: true, marked: true, selectedColor: 'blue' },
                }}
            />
            <Text style={styles.dateText}>Selected Date: {selectedDate || 'None'}</Text>
            <FlatList
                data={availability}
                keyExtractor={(item) => item.availability_schedule_id}
                renderItem={({ item }) => (
                    <TouchableOpacity disabled={!item.is_available} style={[styles.slot, !item.is_available && styles.unavailable]}>
                        <Text>
                            {item.start_time} - {item.end_time}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    dateText: { fontSize: 16, marginVertical: 10 },
    slot: { padding: 12, marginBottom: 8, backgroundColor: '#c8e6c9', borderRadius: 5 },
    unavailable: { backgroundColor: '#ffcdd2' },
});
