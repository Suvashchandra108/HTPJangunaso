import { useParams } from 'react-router-dom';
import ReportView from './ReportView';

/** Full-page view of one report (the side panel shows the same content). */
export default function ReportDetail() {
  const { id = '' } = useParams();
  return (
    <>
      <div style={{ height: 4, background: 'var(--red)', margin: '-26px -30px 0' }} className="detail-strip" />
      <ReportView id={id} variant="page" />
    </>
  );
}
