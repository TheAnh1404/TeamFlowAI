import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
    title: "TeamFlow AI",
    description: "Lập kế hoạch, theo dõi và nghiệm thu công việc với AI hỗ trợ và con người phê duyệt.",
};
// TODO(TV1): implement the shared product shell in a feature implementation session.
export default function RootLayout({ children }: Readonly<{
    children: ReactNode;
}>) {
    return <html lang="vi"><body>{children}</body></html>;
}
