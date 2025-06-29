import { LoginGradient } from '@/components/gradients/login-gradient';
import '@/styles/login.css';
import { LoginCardGradient } from '@/components/gradients/login-card-gradient';
import { LoginForm } from '@/components/authentication/login-form';
import { GhLoginButton } from '@/components/authentication/gh-login-button';
import { SignIn } from '@clerk/nextjs';
import { FooterCredits } from '@/components/shared/footer-credits';

export default function SignInPage() {
  return (
    <div>
      <LoginGradient />
      <div className="flex items-center justify-center min-h-screen">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-background/80 backdrop-blur-[6px] border border-border/50 shadow-xl",
            }
          }}
          redirectUrl="/dashboard"
        />
      </div>
      <FooterCredits />
      {/* <div className={'flex flex-col'}>
        <div
          className={
            'mx-auto mt-[112px] bg-background/80 w-[343px] md:w-[488px] gap-5 flex-col rounded-lg rounded-b-none login-card-border backdrop-blur-[6px]'
          }
        >
          <LoginCardGradient />
          <LoginForm />
        </div>
        <GhLoginButton label={'Log in with GitHub'} />
        <div
          className={
            'mx-auto w-[343px] md:w-[488px] bg-background/80 backdrop-blur-[6px] px-6 md:px-16 pt-0 py-8 gap-6 flex flex-col items-center justify-center rounded-b-lg'
          }
        >
          <div className={'text-center text-muted-foreground text-sm mt-4 font-medium'}>
            Don't have an account?{' '}
            <a href={'/signup'} className={'text-white'}>
              Sign up
            </a>
          </div>
        </div>
      </div> */}
    </div>
  );
}
