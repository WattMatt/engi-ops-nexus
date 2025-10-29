
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id'> & { id?: string }) => void;
  task: Partial<Task> | null;
  assigneeList: string[];
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, task, assigneeList }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);

    useEffect(() => {
        if (isOpen && task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setAssignedTo(task.assignedTo || '');
            setStatus(task.status || TaskStatus.TODO);
        } else if (isOpen) {
            // Reset for new task
            setTitle('');
            setDescription('');
            setAssignedTo('');
            setStatus(TaskStatus.TODO);
        }
    }, [isOpen, task]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Task title is required.');
            return;
        }
        if (!task?.linkedItemId) {
            alert('Cannot create a task that is not linked to an item.');
            return;
        }
        onSubmit({
            id: task?.id,
            title: title.trim(),
            description: description.trim(),
            assignedTo: assignedTo.trim(),
            status,
            linkedItemId: task!.linkedItemId,
        });
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-white mb-4">{task?.id ? 'Edit Task' : 'Create New Task'}</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="task-title" className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <input id="task-title" type="text" value={title} onChange={e => setTitle(e.target.value)}
                               className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus required />
                    </div>
                    <div>
                        <label htmlFor="task-desc" className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                        <textarea id="task-desc" value={description} onChange={e => setDescription(e.target.value)}
                                  rows={3} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="task-assigned" className="block text-sm font-medium text-gray-300 mb-2">Assigned To (Optional)</label>
                            <input id="task-assigned" type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                                   list="assignee-options"
                                   placeholder="e.g., John Doe" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <datalist id="assignee-options">
                                {assigneeList.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label htmlFor="task-status" className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select id="task-status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">{task?.id ? 'Save Changes' : 'Create Task'}</button>
                </div>
            </form>
        </div>
    );
};

export default TaskModal;
