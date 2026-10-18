import React from 'react';

interface UserAvatarProps {
  avatar?: string;
  name?: string;
  color?: string;
  className?: string;
  title?: string;
  onClick?: () => void;
}

export const isAvatarImage = (avatar?: string): boolean => {
  if (!avatar) return false;
  return (
    avatar.startsWith('/') ||
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('data:image/') ||
    avatar.includes('.png') ||
    avatar.includes('.jpg') ||
    avatar.includes('.webp') ||
    avatar.includes('.svg')
  );
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  color = 'bg-red-600 text-white',
  className = 'w-7 h-7 text-xs',
  title,
  onClick,
}) => {
  const isImg = isAvatarImage(avatar);

  return (
    <div
      title={title || name}
      onClick={onClick}
      className={`relative rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 select-none ${
        isImg ? 'bg-white dark:bg-[#1a1c24] border border-neutral-200/80 dark:border-neutral-700/60' : color
      } ${className}`}
    >
      {isImg ? (
        <img
          src={avatar}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{avatar || (name ? name.slice(0, 2).toUpperCase() : 'AK')}</span>
      )}
    </div>
  );
};
