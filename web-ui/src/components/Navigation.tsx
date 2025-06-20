import type { VNode } from "preact"
import { useLocation } from "preact-iso"
import cn from "../utils/cn"

const links: {label: string,path: string, icon: VNode}[] = [
    {
        label: 'Home',
        path: '/',
        icon: (
            // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-full">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
        )
    }, {
        label: 'Settings',
        path: '/settings',
        icon: (
            // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-full">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
            </svg>
        )
    }
]

const Navigation = () => {
    const {path: currentPath} = useLocation()

    return (
        <nav className='h-16 border-t border-gray-200 dark:border-gray-800'>
            <ul className='flex h-full items-center justify-evenly list-none'>
                {links.map((link, index) => {
                    const {label, path, icon} = link

                    return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                        <li key={index}>
                            <a href={path} className={cn(
                                'flex flex-col items-center p-1',
                                path === currentPath && 'text-teal-500',
                                path !== currentPath && 'text-gray-800 dark:text-white/90'
                            )}>
                                <div className='h-8'>{icon}</div>
                                <div className='text-sm'>{label}</div>
                            </a>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

export default Navigation