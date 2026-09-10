import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Cờ Vua Sài Gòn · Kết quả thi đấu',description:'Tra cứu điểm số, từng ván đấu và thứ hạng của con.',manifest:'/manifest.webmanifest',robots:{index:false,follow:false},icons:{icon:'/company-logo.png',apple:'/company-logo.png'},appleWebApp:{capable:true,title:'Cờ Vua Sài Gòn',statusBarStyle:'default'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
