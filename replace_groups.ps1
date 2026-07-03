$content = Get-Content "assert_WEB\src\pages\Tools.jsx" -Raw

$oldMarkerStart = '<section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">'
$oldMarkerEnd = '</section>'

$index1 = $content.IndexOf($oldMarkerStart, $content.IndexOf('内置工具') + 10)
$index2 = $content.IndexOf('{showConfigModal', $index1)

$oldPart = $content.Substring($index1, $index2 - $index1)

$newPart = @'
{groups.map((group) => {
          const groupTools = externalTools.filter(t => t.groupId === group.id);
          if (groupTools.length === 0) return null;
          return (
            <section key={group.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-500" />
                {group.name}
              </h3>
              {group.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{group.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupTools.map((tool) => {
                  const Icon = getIcon(tool.icon);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => openExternalTool(tool.url, tool.id)}
                      className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        {tool.avatar ? (
                          <img
                            src={tool.avatar}
                            alt={tool.name}
                            className="w-10 h-10 rounded-xl object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<div class="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M20.84 13.13a1 1 0 0 0 0-1.41l-.99-.99a1 1 0 0 0-1.41 0l-.49.49a1 1 0 0 0 1.41 1.41l.99-.99z"/></svg></div>`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1">
                            {tool.name}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h4>
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {tool.url}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
'@

$content = $content.Remove($index1, $oldPart.Length).Insert($index1, $newPart)
Set-Content "assert_WEB\src\pages\Tools.jsx" $content -NoNewline
Write-Host "Done"