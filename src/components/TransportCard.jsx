import './TransportCard.css';

export default function TransportCard({ transport, onAddToTimeline }) {
  return (
    <article className="transport-card">
      <div className="transport-card-header">
        <span className="transport-mode">{transport.mode}</span>
        <span className="transport-time">⏱ {transport.travelTime}</span>
      </div>
      <p className="transport-route">{transport.routeOverview}</p>
      {transport.nextTrainTimes?.length > 0 && (
        <div className="transport-times">
          <span>Next: {transport.nextTrainTimes.join(', ')}</span>
        </div>
      )}
      <p className="transport-arrival">Arrival ~ {transport.estimatedArrival}</p>
      <button type="button" className="primary" onClick={onAddToTimeline}>
        Add to timeline
      </button>
    </article>
  );
}
