import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export default function ContextMenu({ xPos, yPos, menuItems, showMenu, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, onClose]);

  if (!showMenu) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: yPos, left: xPos }}
    >
      <ul>
        {menuItems.map((item, index) => (
          <li
            key={index}
            className={item.disabled ? 'disabled' : ''}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose(); // Close menu after action
              }
            }}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
