import React, { useState } from 'react';
import { Clock, Plus, Trash2, Calendar } from 'lucide-react';
import { TIMELINE_MILESTONE } from '../constants/rcaConstants';

/**
 * RCATimelineEditor
 * Chronological Incident Event Timeline for Prompt 52 & Prompt 53.
 */
export const RCATimelineEditor = ({
  events = [],
  onChange,
  isReadOnly = false,
}) => {
  const [time, setTime] = useState('');
  const [milestone, setMilestone] = useState(TIMELINE_MILESTONE.DETECTION);
  const [actor, setActor] = useState('');
  const [description, setDescription] = useState('');

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newEvent = {
      id: `evt_${Date.now()}`,
      time: time.trim() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      milestone,
      actor: actor.trim() || 'SRE Team',
      description: description.trim(),
    };

    if (onChange) {
      onChange([...events, newEvent]);
    }

    setTime('');
    setActor('');
    setDescription('');
  };

  const handleRemove = (index) => {
    if (onChange) {
      onChange(events.filter((_, i) => i !== index));
    }
  };

  const milestoneStyles = {
    [TIMELINE_MILESTONE.DETECTION]: 'bg-rose-50 text-severity-blocker border-rose-200',
    [TIMELINE_MILESTONE.ESCALATION]: 'bg-amber-50 text-status-on-hold border-amber-200',
    [TIMELINE_MILESTONE.MITIGATION]: 'bg-blue-50 text-status-open border-blue-200',
    [TIMELINE_MILESTONE.RESOLUTION]: 'bg-emerald-50 text-status-resolved border-emerald-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-sm font-bold text-text-primary flex items-center gap-2">
          <Clock className="w-4 h-4 text-btn-primary" />
          <span>Incident Chronology & Timeline</span>
        </h3>
        <span className="text-[11px] text-text-muted">{events.length} chronological milestones</span>
      </div>

      {events.length === 0 ? (
        <div className="py-6 px-4 rounded-xl border border-dashed border-border-subtle text-center text-xs text-text-muted">
          No chronological timeline events logged yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {events.map((evt, idx) => (
            <div key={evt.id || idx} className="relative flex items-start justify-between gap-3 text-xs">
              {/* Timeline Node Dot */}
              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-surface-card border-2 border-btn-primary shadow-xs" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-text-primary">{evt.time}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                      milestoneStyles[evt.milestone] || milestoneStyles[TIMELINE_MILESTONE.DETECTION]
                    }`}
                  >
                    {evt.milestone}
                  </span>
                  <span className="text-text-muted">•</span>
                  <span className="text-text-secondary font-medium">{evt.actor}</span>
                </div>
                <p className="text-text-primary text-xs leading-relaxed">{evt.description}</p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 text-text-muted hover:text-severity-blocker rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Add Event Row */}
      {!isReadOnly && (
        <form onSubmit={handleAddEvent} className="pt-2 p-3 bg-canvas-main rounded-xl border border-border-subtle space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Timestamp (e.g. 14:02 UTC)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted"
            />
            <select
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary capitalize"
            >
              <option value={TIMELINE_MILESTONE.DETECTION}>Detection</option>
              <option value={TIMELINE_MILESTONE.ESCALATION}>Escalation</option>
              <option value={TIMELINE_MILESTONE.MITIGATION}>Mitigation</option>
              <option value={TIMELINE_MILESTONE.RESOLUTION}>Resolution</option>
            </select>
            <input
              type="text"
              placeholder="Actor / Alert Source (e.g. SRE Lead)"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Describe event (e.g. Automated failover triggered to secondary Kafka cluster)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-btn-primary hover:bg-primary-hover text-white flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RCATimelineEditor;
