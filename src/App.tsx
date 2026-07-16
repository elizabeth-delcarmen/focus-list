import { useState } from 'react';
import { BacklogDndProvider } from './components/BacklogDndProvider';
import { BacklogView } from './components/BacklogView';
import { ChoresView } from './components/ChoresView';
import { TodayViewSkeleton } from './components/Skeleton';
import { SetupScreen } from './components/SetupScreen';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { SignInScreen } from './components/SignInScreen';
import { TodayView } from './components/TodayView';
import { TopBar } from './components/TopBar';
import { AddChoreBottomSheet } from './components/AddChoreBottomSheet';
import { useAuth } from './hooks/useAuth';
import { useCapacityWindow } from './hooks/useCapacityWindow';
import { useChoreRooms } from './hooks/useChoreRooms';
import { useChores } from './hooks/useChores';
import { useTasks } from './hooks/useTasks';
import { isSupabaseConfigured } from './lib/supabase';
import { sumEstimateMinutes, getBacklogCompletedTasks } from './types';
import { getScheduleFilterForChore } from './lib/choreSchedule';
import type { Chore, ChoreScheduleFilter, View } from './types';

export default function App() {
  const { user, loading: authLoading, signInWithMagicLink, signOut } = useAuth();
  const {
    tasks,
    backlogTasks,
    completedTasks,
    loading: tasksLoading,
    error,
    addTask,
    addTodayTask,
    updateTask,
    completeTask,
    undoComplete,
    deleteTask,
    reorderTasks,
    reorderBacklogTasks,
    scheduleForToday,
  } = useTasks(user?.id);
  const {
    chores,
    loading: choresLoading,
    error: choresError,
    addChore,
    completeChore,
    updateChore,
    deleteChore,
  } = useChores(user?.id);
  const { existingRooms, rememberRoom } = useChoreRooms(chores);
  const {
    availableMinutes,
    isCustomWindow,
    setEndTime,
    clearEndTime,
  } = useCapacityWindow();
  const [currentView, setCurrentView] = useState<View>('rooms');
  const [pendingChoreScheduleFilter, setPendingChoreScheduleFilter] =
    useState<ChoreScheduleFilter | null>(null);
  const [choreSheetOpen, setChoreSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  const openNewTask = () => {
    setSheetKey((key) => key + 1);
    setChoreSheetOpen(true);
  };

  const handleChoreAdded = (chore: Chore) => {
    setPendingChoreScheduleFilter(getScheduleFilterForChore(chore));
    setCurrentView('rooms');
  };

  const plannedMinutes = sumEstimateMinutes(tasks);
  const backlogCompletedTasks = getBacklogCompletedTasks(completedTasks);

  const handleSignOut = async () => {
    localStorage.removeItem('focus-list-active-task-id');
    localStorage.removeItem('focus-list-timer-started-at');
    localStorage.removeItem('focus-list-paused-elapsed-seconds');
    await signOut();
  };

  const sidebarProps = {
    currentView,
    onNavigate: setCurrentView,
    onAdd: openNewTask,
    enableTodayDropTarget: currentView === 'backlog',
  };

  const renderMain = () => {
    if (currentView === 'rooms' || currentView === 'schedule') {
      return (
        <ChoresView
          mode={currentView === 'rooms' ? 'rooms' : 'schedule'}
          chores={chores}
          choresError={choresError}
          loading={choresLoading}
          pendingScheduleFilter={pendingChoreScheduleFilter}
          onPendingScheduleFilterApplied={() => setPendingChoreScheduleFilter(null)}
          onAddChore={addChore}
          onCompleteChore={completeChore}
          onUpdateChore={updateChore}
          onDeleteChore={deleteChore}
          addTodayTask={addTodayTask}
          addBacklogTask={addTask}
          hideFab
        />
      );
    }

    if (currentView === 'today') {
      return (
        <TodayView
          tasks={tasks}
          completedTasks={completedTasks}
          tasksLoading={tasksLoading}
          updateTask={updateTask}
          completeTask={completeTask}
          undoComplete={undoComplete}
          deleteTask={deleteTask}
          reorderTasks={reorderTasks}
          addTodayTask={addTodayTask}
          addBacklogTask={addTask}
          addChore={addChore}
          existingRooms={existingRooms}
          onRememberRoom={rememberRoom}
          onChoreAdded={handleChoreAdded}
          onNavigateToBacklog={() => setCurrentView('backlog')}
          hideFab
        />
      );
    }

    if (currentView === 'backlog') {
      return (
        <BacklogView
          tasks={backlogTasks}
          completedTasks={backlogCompletedTasks}
          loading={tasksLoading}
          onAddTask={addTask}
          onAddToToday={addTodayTask}
          onAddChore={addChore}
          onChoreAdded={handleChoreAdded}
          existingRooms={existingRooms}
          onRememberRoom={rememberRoom}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onCompleteTask={async (id) => {
            const task = backlogTasks.find((t) => t.id === id);
            return completeTask(id, {
              completed_at: new Date().toISOString(),
              actual_minutes: task?.estimate_minutes ?? 0,
            });
          }}
          onUndoComplete={undoComplete}
          onScheduleForToday={scheduleForToday}
          onNavigateToToday={() => setCurrentView('today')}
          hideFab
        />
      );
    }

    if (currentView === 'settings') {
      return (
        <SettingsView
          plannedMinutes={plannedMinutes}
          availableMinutes={availableMinutes}
          taskCount={tasks.length}
          isCustomWindow={isCustomWindow}
          onSetEndTime={setEndTime}
          onClearEndTime={clearEndTime}
          onSignOut={handleSignOut}
          tasksLoading={tasksLoading}
        />
      );
    }

    return null;
  };

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  if (!user) {
    if (authLoading) {
      return (
        <div className="flex min-h-dvh flex-col bg-bg">
          <TopBar />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <Sidebar currentView="rooms" onNavigate={() => {}} onAdd={() => {}} />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pb-24 md:pb-0">
              <TodayViewSkeleton />
            </main>
          </div>
        </div>
      );
    }

    return <SignInScreen onSignIn={signInWithMagicLink} />;
  }

  const displayError = error ?? choresError;

  const layout = (
    <>
      <Sidebar {...sidebarProps} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pb-24 md:pb-0">
        {displayError && (
          <div className="mx-4 mt-4 rounded-[12px] border border-urgent-border bg-urgent-bg px-4 py-2 text-base text-urgent sm:mx-6 md:text-sm">
            {displayError}
          </div>
        )}
        {renderMain()}
      </main>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar onSignOut={handleSignOut} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {currentView === 'backlog' ? (
          <BacklogDndProvider
            tasks={backlogTasks}
            onReorder={reorderBacklogTasks}
            onSchedule={scheduleForToday}
            onNavigateToToday={() => setCurrentView('today')}
          >
            {layout}
          </BacklogDndProvider>
        ) : (
          layout
        )}
      </div>

      <AddChoreBottomSheet
        key={`chore-${sheetKey}`}
        open={choreSheetOpen}
        existingRooms={existingRooms}
        onClose={() => setChoreSheetOpen(false)}
        onAddChore={addChore}
        saveError={choresError}
        onRememberRoom={rememberRoom}
        onChoreAdded={handleChoreAdded}
      />
    </div>
  );
}
