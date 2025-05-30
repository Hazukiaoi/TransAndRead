export default function Titlebar({ currentProjectName, hasUnsavedChanges, onTitleClick }) {
  const appName = "Bilingual TRS Editor";
  let title = currentProjectName ? `${currentProjectName}` : appName;
  if (hasUnsavedChanges) {
    title += "*";
  }
  if (currentProjectName && hasUnsavedChanges) { // Ensure appName is appended correctly if project name exists
      title = `${currentProjectName}* - ${appName}`;
  } else if (currentProjectName) {
      title = `${currentProjectName} - ${appName}`;
  } else if (hasUnsavedChanges) { // App name with asterisk if no project name but changes exist
      title = `${appName}*`;
  }


  // A simple way to make the title clickable, could be more styled like a button if needed
  const titleStyle = onTitleClick ? { cursor: 'pointer', textDecoration: 'underline' } : {};

  return (
    <div className="titlebar">
      <h1 onClick={onTitleClick} style={titleStyle} title={onTitleClick ? "Click to save project" : ""}>
        {title}
      </h1>
    </div>
  );
}
