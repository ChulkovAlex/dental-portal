import { useSearchParams } from 'react-router-dom';
import { sendMail } from '../api/email';

export default function Reject() {
  const [params] = useSearchParams();
  const email = params.get('email');
  const handle = () => {
    sendMail(email!, 'Отказ', '<p>Вам отказано в регистрации.</p>');
    alert('Письмо отправлено');
    window.location.href = '/dashboard';
  };

  return (
    <div className="p-10 text-center">
      <h2>Отклонить пользователя {email}?</h2>
      <button onClick={handle} className="btn-primary mt-4">Отклонить</button>
    </div>
  );
}