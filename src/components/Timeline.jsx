import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { formatHour } from '../utils/time';
import './Timeline.css';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8–23

function timeToSlot(hour) {
  return (Number(hour) - 8) * 48; // 48px per hour, supports fractional
}

function slotToTime(slot) {
  return Math.round(slot / 48) + 8;
}

export default function Timeline({ day }) {
  const { updateDayTimeline, updateTimelineItem, removeFromTimeline } = useItinerary();
  const [selecting, setSelecting] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const timeline = day.timeline || [];

  const addBlock = (startHour, endHour, label = 'New activity') => {
    const start = Math.min(startHour, endHour);
    const end = Math.max(startHour, endHour);
    const duration = end - start;
    const newItem = {
      id: `tl-${Date.now()}`,
      name: label,
      startHour: start,
      endHour: end,
      duration: duration,
      notes: '',
    };
    updateDayTimeline(day.id, [...timeline, newItem]);
    setSelecting(null);
  };

  const handleSlotClick = (hour) => {
    if (!selecting) {
      setSelecting({ start: hour });
      return;
    }
    addBlock(selecting.start, hour);
  };

  const handleDurationChange = (index, newDuration) => {
    const item = timeline[index];
    const endHour = Math.min(23, item.startHour + Number(newDuration));
    updateTimelineItem(day.id, index, { duration: endHour - item.startHour, endHour });
  };

  const totalTravelTime = timeline.reduce((acc, t) => acc + (t.endHour - t.startHour), 0);

  return (
    <div className="timeline-wrap">
      <div className="timeline-grid">
        <div className="timeline-labels">
          {HOURS.map((h) => (
            <div key={h} className="timeline-label">
              {h === 12 ? '12:00' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}
            </div>
          ))}
        </div>
        <div className="timeline-slots">
          {HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              className={`timeline-slot ${selecting ? 'timeline-slot-selectable' : ''}`}
              onClick={() => handleSlotClick(hour)}
              title={selecting ? `Set end time (start: ${selecting.start}:00)` : 'Click to set start, then click end time'}
            >
              {selecting && selecting.start === hour && <span className="timeline-slot-start">Start</span>}
            </button>
          ))}
        </div>
        <div className="timeline-blocks" style={{ height: HOURS.length * 48 }}>
          {timeline.map((item, index) => {
            const top = timeToSlot(item.startHour);
            const height = (item.endHour - item.startHour) * 48;
            const isTransport = item.type === 'transport';
            const durationDisplay = isTransport && (item.durationMinutes != null)
              ? `${item.durationMinutes} min`
              : isTransport && item.duration
                ? `${item.duration}h`
                : null;
            const mapUrl = (item.mapUrl || '').trim();
            const isEditing = editingIndex === index;

            return (
              <div
                key={item.id}
                className={`timeline-block ${isTransport ? 'timeline-block-transport' : ''}`}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="timeline-block-inner">
                  {isTransport ? (
                    <>
                      <span className="timeline-block-transport-label">🚆 {item.lineName || 'Transport'}</span>
                      <span className="timeline-block-time">
                        {formatHour(item.startHour)} – {formatHour(item.endHour)}
                      </span>
                      {durationDisplay && <span className="timeline-block-transport-duration">{durationDisplay}</span>}
                    </>
                  ) : (
                    <>
                      <div className="timeline-block-name-row">
                        {mapUrl && !isEditing ? (
                          <a
                            className="timeline-block-name-link"
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in Google Maps"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <input
                            type="text"
                            className="timeline-block-name-input"
                            value={item.name}
                            onChange={(e) => updateTimelineItem(day.id, index, { name: e.target.value })}
                            onBlur={() => setEditingIndex(null)}
                            placeholder="Activity name"
                            autoFocus={isEditing}
                          />
                        )}
                        <button
                          type="button"
                          className="timeline-block-edit"
                          onClick={() => setEditingIndex((cur) => (cur === index ? null : index))}
                          aria-label="Edit name"
                          title="Edit name"
                        >
                          ✎
                        </button>
                      </div>
                      <span className="timeline-block-time">
                        {formatHour(item.startHour)} – {formatHour(item.endHour)}
                      </span>
                      <label className="timeline-block-duration">
                        Duration (hrs):{' '}
                        <input
                          type="number"
                          min={0.5}
                          max={15}
                          step={0.5}
                          value={item.duration}
                          onChange={(e) => handleDurationChange(index, e.target.value)}
                        />
                      </label>
                      <input
                        type="text"
                        className="timeline-block-notes"
                        placeholder="Notes"
                        value={item.notes}
                        onChange={(e) => updateTimelineItem(day.id, index, { notes: e.target.value })}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    className="timeline-block-remove"
                    onClick={() => removeFromTimeline(day.id, index)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selecting && (
        <p className="timeline-hint">Click an end hour to create a block (8–23)</p>
      )}
      {timeline.length > 0 && (
        <p className="timeline-total">Total: {totalTravelTime} hrs this day</p>
      )}
    </div>
  );
}
