import { useState } from 'react';
import { BacklogDndProvider } from './components/BacklogDndProvider';
import { BacklogView } from './components/BacklogView';
import { TodayViewSkeleton } from './components/Skeleton';
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
    backlogTasks,
    completedTasks,
    loading: tasksLoading,
    error,
    addTask,
    updateTask,
    completeTask,
    undoComplete,
    deleteTask,
    reorderTasks,
    reorderBacklogTasks,
    scheduleForToday,
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

  const sidebarProps = {
    currentView,
    onNavigate: setCurrentView,
    onSignOut: handleSignOut,
    plannedMinutes,
    availableMinutes,
    taskCount: tasks.length,
    isCustomWindow,
    endTime,
    onSetEndTime: setEndTime,
    onClearEndTime: clearEndTime,
    tasksLoading,
    enableTodayDropTarget: currentView === 'backlog',
  };

  const renderMain = () => {
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
          onNavigateToBacklog={() => setCurrentView('backlog')}
        />
      );
    }

    if (currentView === 'backlog') {
      return (
        <BacklogView
          tasks={backlogTasks}
          loading={tasksLoading}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onCompleteTask={async (id) => {
            const task = backlogTasks.find((t) => t.id === id);
            await completeTask(id, {
              completed_at: new Date().toISOString(),
              actual_minutes: task?.estimate_minutes ?? 0,
            });
          }}
          onScheduleForToday={scheduleForToday}
          onNavigateToToday={() => setCurrentView('today')}
        />
      );
    }

    if (isPlaceholderView(currentView)) {
      return <PlaceholderView view={currentView} />;
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
            <Sidebar
              currentView="today"
              onNavigate={() => {}}
              onSignOut={() => {}}
              plannedMinutes={0}
              availableMinutes={availableMinutes}
              taskCount={0}
              isCustomWindow={isCustomWindow}
              endTime={endTime}
              onSetEndTime={setEndTime}
              onClearEndTime={clearEndTime}
              tasksLoading
            />
            <main className="flex min-h-0 flex-1 flex-col overflow-auto pb-20 md:pb-0">
              <TodayViewSkeleton />
            </main>
          </div>
        </div>
      );
    }

    return <SignInScreen onSignIn={signInWithMagicLink} />;
  }

  const layout = (
    <>
      <Sidebar {...sidebarProps} />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto pb-20 md:pb-0">
        {error && (
          <div className="mx-4 mt-4 rounded-[12px] border border-urgent-border bg-urgent-bg px-4 py-2 text-base text-urgent sm:mx-6 md:text-sm">
            {error}
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
    </div>
  );
}
