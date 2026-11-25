import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap">
      <p className="empty">
        찾는 페이지가 없습니다. 기사가 내려갔거나 주소가 바뀌었을 수 있습니다. <Link href="/">첫 화면으로</Link>
      </p>
    </div>
  );
}
