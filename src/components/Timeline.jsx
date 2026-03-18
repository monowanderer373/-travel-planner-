import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { formatHour } from '../utils/time';
import './Timeline.css';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8–23

/** For each row i (0–15), return 'slot' | 'empty' | { type: 'block', block, index, span } */
function getRowContents(timeline) {
  const rows = [];
  for (let i = 0; i < 16; i++) {
    const hour = 8 + i;
    const blockAtStart = timeline.find((b) => b.startHour === hour);
    const blockCovering = timeline.find((b) => b.startHour < hour && b.endHour > hour);
    if (blockAtStart) {
      rows.push({
        type: 'block',
        block: blockAtStart,
        index: timeline.indexOf(blockAtStart),
        span: blockAtStart.endHour - blockAtStart.startHour,
      });
    } else if (blockCovering) {
      rows.push({ type: 'empty' });
    } else {
      rows.push({ type: 'slot', hour });
    }
  }
  return rows;
}

export default function Timeline({ day }) {
  const { updateDayTimeline, removeFromTimeline } = useItinerary();
  const [selecting, setSelecting] = useState(null);

  const timeline = day.timeline || [];
  const rowContents = getRowContents(timeline);

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
        <div className="timeline-content">
          {rowContents.map((row, i) => {
            if (row.type === 'slot') {
              return (
                <button
                  key={`slot-${row.hour}`}
                  type="button"
                  className={`timeline-slot ${selecting ? 'timeline-slot-selectable' : ''}`}
                  style={{ gridRow: `${i + 1} / auto` }}
                  onClick={() => handleSlotClick(row.hour)}
                  title={selecting ? `Set end time (start: ${selecting.start}:00)` : 'Click to set start, then click end time'}
                >
                  {selecting && selecting.start === row.hour && <span className="timeline-slot-start">Start</span>}
                </button>
              );
            }
            if (row.type === 'empty') {
              return <div key={`empty-${i}`} className="timeline-row-empty" style={{ gridRow: `${i + 1} / auto` }} aria-hidden />;
            }
            const { block, index, span } = row;
            const isTransport = block.type === 'transport';
            const durationDisplay = isTransport && block.durationMinutes != null
              ? `${block.durationMinutes} min`
              : isTransport && block.duration
                ? `${block.duration}h`
                : null;

            return (
              <div
                key={block.id}
                className={`timeline-block ${isTransport ? 'timeline-block-transport' : ''}`}
                style={{ gridRow: `${i + 1} / span ${span}` }}
              >
                <div className="timeline-block-inner">
                  {isTransport ? (
                    <>
                      <span className="timeline-block-transport-label">🚆 {block.lineName || 'Transport'}</span>
                      <span className="timeline-block-time">
                        {formatHour(block.startHour)} – {formatHour(block.endHour)}
                      </span>
                      {durationDisplay && <span className="timeline-block-transport-duration">{durationDisplay}</span>}
                    </>
                  ) : (
                    <span className="timeline-block-name">{block.name}</span>
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
