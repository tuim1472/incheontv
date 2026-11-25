import Link from 'next/link';
import '../admin.css';

export const dynamic = 'force-dynamic';

export default function SuspendedPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="logo-mark">
          인천<b>TV</b>
        </Link>
        <p className="alert warn">
          <b>사용이 정지된 계정입니다.</b>
          초대받지 않은 계정이거나 데스크가 사용을 정지했습니다. 다시 사용하려면 데스크에게 요청해 주세요.
        </p>
        <form action="/auth/signout" method="post">
          <button className="btn">로그아웃</button>
        </form>
      </div>
    </div>
  );
}
