
import React, { useState, useEffect, useRef } from 'react';
import { ListTodo, Plus, Trash2, Edit2, GripVertical, Check, X, CheckSquare, Square } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { Task } from '../types';
import * as storage from '../services/storage';

export const TaskList: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editText, setEditText] = useState('');

    // Drag & Drop state
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        setTasks(storage.getTasks());
    }, []);

    const saveAndSetTasks = (newTasks: Task[]) => {
        setTasks(newTasks);
        storage.saveTasks(newTasks);
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        const newTask: Task = {
            id: crypto.randomUUID(),
            text: newTaskText.trim(),
            completed: false,
        };
        saveAndSetTasks([newTask, ...tasks]);
        setNewTaskText('');
    };

    const handleToggleComplete = (id: string) => {
        const newTasks = tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        saveAndSetTasks(newTasks);
    };

    const handleDeleteTask = (id: string) => {
        const newTasks = tasks.filter(task => task.id !== id);
        saveAndSetTasks(newTasks);
    };

    const handleStartEdit = (task: Task) => {
        setEditingTask(task);
        setEditText(task.text);
    };

    const handleSaveEdit = () => {
        if (!editingTask) return;
        const newTasks = tasks.map(task =>
            task.id === editingTask.id ? { ...task, text: editText } : task
        );
        saveAndSetTasks(newTasks);
        setEditingTask(null);
        setEditText('');
    };

    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        setDragActive(true);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (dragItem.current === null || dragOverItem.current === null) return;

        const newTasks = [...tasks];
        const dragItemContent = newTasks.splice(dragItem.current, 1)[0];
        newTasks.splice(dragOverItem.current, 0, dragItemContent);

        dragItem.current = null;
        dragOverItem.current = null;

        saveAndSetTasks(newTasks);
        setDragActive(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <ListTodo className="w-6 h-6 text-brand-600" /> Lista de Tarefas
                </h1>
                <div className="flex gap-2">
                    <CustomInput
                        type="text"
                        value={newTaskText}
                        onChange={e => setNewTaskText(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddTask()}
                        placeholder="Adicionar nova tarefa..."
                    />
                    <Button onClick={handleAddTask} className="px-4">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {tasks.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>Tudo limpo por aqui!</p>
                    </div>
                ) : (
                    tasks.map((task, index) => (
                        <div
                            key={task.id}
                            draggable={editingTask?.id !== task.id}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className={`group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing transition-all ${dragActive && dragItem.current === index ? 'opacity-50 scale-95 shadow-2xl' : ''}`}
                        >
                            <GripVertical className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            <button onClick={() => handleToggleComplete(task.id)} className="p-1">
                                {task.completed ? <CheckSquare className="w-6 h-6 text-green-500" /> : <Square className="w-6 h-6 text-gray-300 dark:text-gray-500" />}
                            </button>

                            {editingTask?.id === task.id ? (
                                <CustomInput
                                    type="text"
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    autoFocus
                                    className="flex-1 bg-transparent border-none p-0"
                                />
                            ) : (
                                <span className={`flex-1 text-sm font-medium transition-colors ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {task.text}
                                </span>
                            )}

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {editingTask?.id === task.id ? (
                                    <>
                                        <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingTask(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-4 h-4" /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleStartEdit(task)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
