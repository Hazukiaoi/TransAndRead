export default function Titlebar({ currentProjectName }) {
  const appName = "Bilingual TRS Editor";
  const title = currentProjectName ? `${currentProjectName} - ${appName}` : appName;

  return (
    <div className="titlebar">
      <h1>{title}</h1>
    </div>
  );
}
