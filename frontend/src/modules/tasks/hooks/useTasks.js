/**
 * useTasks — Unified hook for tasks data management, filtering, and real-time updates.
 * Used by AllTasksPage, MyTasksPage, and contextual task drawers.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { taskService, connectTasksWebSocket } from '../services/taskService';

export const useTasks = ({ isMyTasks = false, initialFilters = {}, autoConnect = true } = {}) => {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 25,
    status: '',
    priority: '',
    task_type: '',
    search: '',
    ...initialFilters,
  });

  const wsRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeParams = Object.entries(filters).reduce((acc, [k, v]) => {
        if (v !== '' && v !== null && v !== undefined) acc[k] = v;
        return acc;
      }, {});

      const data = isMyTasks
        ? await taskService.listMy(activeParams)
        : await taskService.list(activeParams);

      setTasks(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err);
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isMyTasks, filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle WebSocket live updates
  const handleWsMessage = useCallback((payload) => {
    if (!payload?.event) return;

    switch (payload.event) {
      case 'task_created':
        if (payload.task) {
          setTasks((prev) => [payload.task, ...prev]);
          setTotal((prev) => prev + 1);
        }
        break;
      case 'task_updated':
        if (payload.task_id && payload.changes) {
          setTasks((prev) =>
            prev.map((t) => (t.id === payload.task_id ? { ...t, ...payload.changes } : t))
          );
          setSelectedTask((prev) =>
            prev && prev.id === payload.task_id ? { ...prev, ...payload.changes } : prev
          );
        }
        break;
      case 'task_status_changed':
        if (payload.task_id && payload.status) {
          setTasks((prev) =>
            prev.map((t) => (t.id === payload.task_id ? { ...t, status: payload.status } : t))
          );
          setSelectedTask((prev) =>
            prev && prev.id === payload.task_id ? { ...prev, status: payload.status } : prev
          );
        }
        break;
      case 'task_deleted':
        if (payload.task_id) {
          setTasks((prev) => prev.filter((t) => t.id !== payload.task_id));
          setTotal((prev) => Math.max(0, prev - 1));
          setSelectedTask((prev) => (prev && prev.id === payload.task_id ? null : prev));
        }
        break;
      case 'comment_added':
        if (payload.task_id) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === payload.task_id
                ? { ...t, comment_count: (t.comment_count || 0) + 1 }
                : t
            )
          );
          setSelectedTask((prev) =>
            prev && prev.id === payload.task_id
              ? { ...prev, comment_count: (prev.comment_count || 0) + 1 }
              : prev
          );
        }
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (!autoConnect) return;
    wsRef.current = connectTasksWebSocket(handleWsMessage);
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [autoConnect, handleWsMessage]);

  const createTask = async (payload) => {
    const newTask = await taskService.create(payload);
    setTasks((prev) => [newTask, ...prev]);
    setTotal((prev) => prev + 1);
    return newTask;
  };

  const updateTask = async (taskId, updates) => {
    const updated = await taskService.update(taskId, updates);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(updated);
    }
    return updated;
  };

  const changeStatus = async (taskId, newStatus) => {
    const updated = await taskService.changeStatus(taskId, newStatus);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(updated);
    }
    return updated;
  };

  const deleteTask = async (taskId) => {
    await taskService.delete(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // reset page on filter change
    }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 25,
      status: '',
      priority: '',
      task_type: '',
      search: '',
    });
  };

  return {
    tasks,
    total,
    loading,
    error,
    filters,
    selectedTask,
    setSelectedTask,
    fetchTasks,
    createTask,
    updateTask,
    changeStatus,
    deleteTask,
    updateFilter,
    resetFilters,
  };
};

export default useTasks;
