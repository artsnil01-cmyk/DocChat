import styles from "./brand-lockup.module.css";

type BrandLockupProps = {
  className?: string;
};

export function BrandLockup({ className }: BrandLockupProps) {
  const rootClassName = className
    ? `${styles.brandLockup} ${className}`
    : styles.brandLockup;

  return (
    <div className={rootClassName}>
      <span className={styles.brandName}>
        Doc<span>Chat</span>
      </span>
      <span className={styles.brandBy}>by Smartly.ai</span>
    </div>
  );
}
