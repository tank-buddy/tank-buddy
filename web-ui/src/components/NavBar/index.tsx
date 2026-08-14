import ThemeToggle from '../ThemeToggle'

const NavBar = () => (
  <header
    data-testid="nav-bar"
    class="sticky top-0 z-10 border-b border-separator bg-surface-sunken/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
  >
    <div class="mx-auto flex h-11 max-w-120 items-center gap-2.5 px-4">
      {/* Same file the favicon points at, so the browser reuses it instead of
          shipping a second copy inlined in the JS bundle. The wordmark beside it
          carries the name, so the image itself is decorative. */}
      <img src="/tank-buddy.svg" alt="" class="size-7" />
      <span class="flex-1 text-[17px] font-semibold tracking-tight text-label">
        TankBuddy
      </span>
      <ThemeToggle />
    </div>
  </header>
)

export default NavBar
