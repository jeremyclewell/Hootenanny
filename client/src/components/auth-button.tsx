import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, LogOut, ListChecks, User as UserIcon } from "lucide-react";

interface AuthButtonProps {
  /** When true, render the inverted "on dark hero" style. */
  variant?: "default" | "onDark";
  /** Hide the "My events" menu item (e.g. when already on /my). */
  hideMyEvents?: boolean;
}

export default function AuthButton({ variant = "default", hideMyEvents }: AuthButtonProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />;
  }

  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        variant={variant === "onDark" ? "secondary" : "outline"}
        className="rounded-full"
        onClick={() => { window.location.href = "/api/login"; }}
        data-testid="button-login"
      >
        <LogIn className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  const initials = (user!.firstName?.[0] || user!.email?.[0] || "?").toUpperCase();
  const displayName =
    [user!.firstName, user!.lastName].filter(Boolean).join(" ") || user!.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/60"
          aria-label="Account menu"
          data-testid="button-account-menu"
        >
          {user!.profileImageUrl ? (
            <img src={user!.profileImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-tight truncate">{displayName}</span>
            {user!.email && (
              <span className="text-xs text-muted-foreground truncate">{user!.email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!hideMyEvents && (
          <Link href="/my">
            <DropdownMenuItem data-testid="menu-my-events">
              <ListChecks className="mr-2 h-4 w-4" />
              My events
            </DropdownMenuItem>
          </Link>
        )}
        <DropdownMenuItem asChild>
          <a href="/api/logout" data-testid="menu-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
