import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { getErrorMessage } from '@/lib/firebase/errors';
import { requestPasswordReset, signIn } from './api';
import { BootScreen } from './RequireAuth';
import { useAuth } from './useAuth';

const schema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (auth.status === 'loading') return <BootScreen />;
  if (auth.status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null);
    setResetNotice(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  const onResetPassword = async () => {
    setSubmitError(null);
    setResetNotice(null);
    if (!(await trigger('email'))) return;
    setResetPending(true);
    try {
      await requestPasswordReset(getValues('email'));
      setResetNotice(
        'Если аккаунт с таким email существует, на него отправлено письмо для сброса пароля.',
      );
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setResetPending(false);
    }
  };

  return (
    <div className="mip">
      <main className="auth">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark" aria-hidden="true">
              m
            </span>
            <div>
              <div className="brand-name">mip</div>
              <div className="brand-sub">наше общее</div>
            </div>
          </div>
          <div>
            <h1 className="h1">Вход</h1>
            <p className="lead">Войдите в общий аккаунт, чтобы продолжить.</p>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <Field label="Email" error={errors.email?.message}>
              {(p) => (
                <TextInput {...p} type="email" autoComplete="username" {...register('email')} />
              )}
            </Field>
            <Field label="Пароль" error={errors.password?.message}>
              {(p) => (
                <TextInput
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                />
              )}
            </Field>

            {submitError && (
              <div className="notice notice-error" role="alert">
                <Icon name="alert" />
                {submitError}
              </div>
            )}
            {resetNotice && (
              <div className="notice notice-info" role="status">
                <Icon name="check" />
                {resetNotice}
              </div>
            )}

            <Button type="submit" pending={isSubmitting} pendingLabel="Входим…">
              Войти
            </Button>
            <Button
              variant="ghost"
              pending={resetPending}
              pendingLabel="Отправляем…"
              onClick={onResetPassword}
            >
              Забыли пароль?
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
