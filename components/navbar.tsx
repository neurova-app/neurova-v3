"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { AvatarFallback, Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"; // ✅ browser version
import { ThemeSwitcher } from "./theme-switcher";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    const supabase = createClient(); // ✅ browser client
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Get user initials for fallback
  const getUserInitials = (user: User | null) => {
    if (!user?.user_metadata?.full_name && !user?.email) return "U";
    
    const name = user.user_metadata?.full_name || user.email || "";
    const parts = name.split(" ");
    
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    
    return name.substring(0, 2).toUpperCase();
  };


  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === path
        ? "text-sky-600 font-semibold border-b-2 border-sky-600"
        : "text-gray-600 hover:text-sky-600"
    }`;

    console.log(user)

  return (
    <div className="sticky top-0 z-50 mb-4 px-4 border-b-2 lg:flex lg:items-center lg:justify-between lg:max-w-[1920px] lg:mx-auto">
      <div className="flex gap-8">
        <div className="h-12 flex items-center justify-center">
          <Link href={"/"} className="text-2xl text-sky-600 font-bold">
            NEUROVA
          </Link>
        </div>

        <NavigationMenu className="h-12">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/patients" className={linkClass("/patients")}>
                Patients
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className="flex items-center">
        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full">
            <Avatar>
              <AvatarImage 
                src={user?.user_metadata?.avatar_url} 
                alt={user?.user_metadata?.full_name || user?.email || "User avatar"}
              />
              <AvatarFallback>
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              {user?.user_metadata?.full_name || user?.email || "My Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
