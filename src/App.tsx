import { useState } from 'react';
import { isPlaceholderView, PlaceholderView } from './components/PlaceholderView';
import { SetupScreen } from './components/SetupScreen';
import { Sidebar } from './components/Sidebar';
import { SignInScreen } from './components/SignInScreen';
import { TodayView } from './components/TodayView';
import { TopBar } from './components/TopBar';
import { useAuth } from './hooks/useAuth';
import { useCapacityWindow } from './hooks/useCapacityWindow';
import { useTasks } from './hooks/useTasks';
import { isSupabaseConfigured } from './lib/supabase';
import { sumEstimateMinutes } from './types';
import type { View } from './types';

export default function App() {
  const { user, loading: authLoading, signInWithMagicLink, signOut } = useAuth();
  const {
    tasks,
    completedTasks,
    loading: tasksLoading,
    error,
    addTask,
    updateTask,
    completeTask,
    undoComplete,
    deleteTask,
    reorderTasks,
  } = useTasks(user?.id);
  const {
    endTime,
    availableMinutes,
    isCustomWindow,
    setEndTime,
    clearEndTime,
  } = useCapacityWindow();
  const [currentView, setCurrentView] = useState<View>('today');

  const plannedMinutes = sumEstimateMinutes(tasks);

  const handleSignOut = async () => {
    localStorage.removeItem('focus-list-active-task-id');
    localStorage.removeItem('focus-list-timer-started-at');
    localStorage.removeItem('focus-list-paused-elapsed-seconds');
    await signOut();
  };

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-base text-text-muted md:text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <SignInScreen onSignIn={signInWithMagicLink} />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          onSignOut={handleSignOut}
          plannedMinutes={plannedMinutes}
          availableMinutes={availableMinutes}
          isCustomWindow={isCustomWindow}
          endTime={endTime}
          onSetEndTime={setEndTime}
          onClearEndTime={clearEndTime}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto pb-20 lg:pb-0">
          {error && (
            <div className="mx-4 mt-4 rounded-[12px] border border-urgent-border bg-urgent-bg px-4 py-2 text-base text-urgent sm:mx-6 md:text-sm">
              {error}
            </div>
          )}
          {tasksLoading && currentView === 'today' ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-text-muted md:text-sm">Loading tasks…</p>
            </div>
          ) : currentView === 'today' ? (
            <TodayView
              tasks={tasks}
              completedTasks={completedTasks}
              availableMinutes={availableMinutes}
              addTask={addTask}
              updateTask={updateTask}
              completeTask={completeTask}
              undoComplete={undoComplete}
              deleteTask={deleteTask}
              reorderTasks={reorderTasks}
            />
          ) : isPlaceholderView(currentView) ? (
            <PlaceholderView view={currentView} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
