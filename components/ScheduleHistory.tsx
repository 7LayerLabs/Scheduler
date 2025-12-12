import { useState, useMemo } from 'react';
import { useSavedSchedules } from '@/lib/instantdb';
import { Employee, WeeklySchedule, ScheduleAssignment } from '@/lib/types';
import ScheduleGrid from './ScheduleGrid';

interface Props {
    employees: Employee[];
    onRestore?: (schedule: WeeklySchedule) => void;
}


function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    );
}

export default function ScheduleHistory({ employees, onRestore }: Props) {
    const { schedules, isLoading } = useSavedSchedules();
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

    // Sort schedules by created date (newest first)
    const sortedSchedules = useMemo(() => {
        return [...schedules].sort((a, b) => b.createdAt - a.createdAt);
    }, [schedules]);

    const selectedSchedule = useMemo(() => {
        if (!selectedScheduleId) return null;
        return schedules.find(s => s.id === selectedScheduleId) || null;
    }, [schedules, selectedScheduleId]);

    // Parse the stored schedule into a format ScheduleGrid accepts
    const scheduleForGrid = useMemo((): WeeklySchedule | null => {
        if (!selectedSchedule) return null;
        try {
            const assignments = JSON.parse(selectedSchedule.assignments) as ScheduleAssignment[];
            // Convert stored assignment dates/IDs to match what ScheduleGrid might expect if needed
            // But ScheduleGrid mostly relies on string matching which should be fine.

            return {
                weekStart: new Date(selectedSchedule.weekStart),
                assignments,
                conflicts: [], // History view doesn't show conflicts
                warnings: []
            };
        } catch (e) {
            console.error('Failed to parse schedule assignments:', e);
            return null;
        }
    }, [selectedSchedule]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-[#e5a825] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-[#6b6b75]">
                <div className="w-16 h-16 bg-[#2a2a32] rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                </div>
                <p className="font-medium text-[#a0a0a8]">No archived schedules yet</p>
                <p className="text-sm mt-1">Generate and archive a schedule to see it here</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar List */}
            <div className="lg:col-span-1 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-white">History</h2>
                    <p className="text-sm text-[#6b6b75]">Archived schedules</p>
                </div>

                <div className="space-y-2">
                    {sortedSchedules.map((schedule) => {
                        const date = new Date(schedule.createdAt);
                        const weekStart = new Date(schedule.weekStart);
                        const isSelected = selectedScheduleId === schedule.id;

                        return (
                            <button
                                key={schedule.id}
                                onClick={() => setSelectedScheduleId(schedule.id)}
                                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${isSelected
                                    ? 'bg-[#e5a825]/10 border-[#e5a825] ring-1 ring-[#e5a825]/50'
                                    : 'bg-[#1a1a1f] border-[#2a2a32] hover:border-[#3a3a45] hover:bg-[#222228]'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-semibold ${isSelected ? 'text-[#e5a825]' : 'text-white'}`}>
                                        Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#6b6b75]">
                                    <span>Archived {date.toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="lg:col-span-3">
                {selectedSchedule && scheduleForGrid ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    Week of {new Date(selectedSchedule.weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </h3>
                                <p className="text-sm text-[#6b6b75]">
                                    Archived by {selectedSchedule.createdBy || 'Unknown'} on {new Date(selectedSchedule.createdAt).toLocaleString()}
                                </p>
                            </div>
                            {onRestore && (
                                <button
                                    onClick={() => scheduleForGrid && onRestore(scheduleForGrid)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <RefreshIcon className="w-4 h-4" />
                                    Restore to Editor
                                </button>
                            )}
                        </div>

                        <ScheduleGrid
                            schedule={scheduleForGrid}
                            weekStart={new Date(selectedSchedule.weekStart)}
                            employees={employees}
                        />
                    </div>
                ) : (
                    <div className="h-full min-h-[400px] bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] border-dashed flex items-center justify-center text-[#6b6b75]">
                        <div className="text-center">
                            <p>Select a schedule to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
