import Link from "next/link";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return <main><h1>Không tìm thấy trang</h1><Link href={routes.home}>Về trang chủ</Link></main>;
}
