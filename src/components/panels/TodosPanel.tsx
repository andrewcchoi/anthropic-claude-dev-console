'use client';

import { useChatStore } from '@/lib/store';
import { X, CheckCircle, Circle } from 'lucide-react';

export function TodosPanel() {
  const { isTodosPanelOpen, setTodosPanelOpen } = useChatStore();

  if (!isTodosPanelOpen) return null;

  // Placeholder - TODO: integrate with actual task system
  const todos = [
    { id: '1', title: 'Example task 1', completed: false },
    { id: '2', title: 'Example task 2', completed: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            TODO List
          </h2>
          <button
            onClick={() => setTodosPanelOpen(false)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {todos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No tasks yet. Task tracking will be integrated in a future update.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  {todo.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      todo.completed
                        ? 'text-gray-500 dark:text-gray-400 line-through'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {todo.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Task tracking integration coming soon
        </div>
      </div>
    </div>
  );
}
