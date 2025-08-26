import { useSearchParams } from 'react-router-dom';
import { sendMail } from '../api/email';

export default function Approve() {
  const [params] = useSearchParams();
  const email = params.get('email');

  const handle = async () => {
    const tempPass = Math.random().toString(36).slice(-8);
    await sendMail(email!, 'Доступ предоставлен', `<p>Ваш пароль: <strong>${tempPass}</strong></p>`);
    alert('Письмо отправлено');
    window.location.href = '/dashboard';
  };

  return (
    <div className="p-10 text-center">
      <h2>Одобрить пользователя {email}?</h2>
      <button onClick={handle} className="btn-primary mt-4">Подтвердить</button>
    </div>
  );
}