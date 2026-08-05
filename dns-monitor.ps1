# DNS 传播监控脚本 — 继续第 3–6 次检查
# 运行方式: powershell -ExecutionPolicy Bypass -File f:\code_x\assert\dns-monitor.ps1

$LogFile = "f:\code_x\assert\dns-check-log.md"
$Domain = "lifeassert.online"
$IntervalSec = 600  # 10 分钟
$StartCheckNo = 3
$EndCheckNo = 6

function Invoke-Cmd($cmd) {
    $output = & cmd /c $cmd 2>&1
    return ($output -join "`r`n")
}

function Run-Check($checkNo) {
    $nowLocal = (Get-Date).AddHours(8)  # 转为北京时间 (UTC+8)
    $ts = $nowLocal.ToString("yyyy-MM-dd HH:mm:ss +0800")

    # 1) NS 查询
    $ns8 = Invoke-Cmd "nslookup -type=ns $Domain 8.8.8.8"
    $ns1 = Invoke-Cmd "nslookup -type=ns $Domain 1.1.1.1"
    $ns119 = Invoke-Cmd "nslookup -type=ns $Domain 119.29.29.29"

    # 2) A 查询
    $a8 = Invoke-Cmd "nslookup $Domain 8.8.8.8"

    # 3) curl HTTPS
    $curlOut = Invoke-Cmd "curl -I -k --max-time 10 https://$Domain 2>&1"

    # ---------- 解析 ----------
    function Parse-NS($text) {
        $servers = @()
        if ($text -match "nameserver\s*=\s*([^\s\r\n]+)") {
            $all = [regex]::Matches($text, "nameserver\s*=\s*([^\s\r\n]+)")
            foreach ($m in $all) { $servers += $m.Groups[1].Value.TrimEnd('.') }
        }
        if ($text -match "Server failed") { return @("__FAILED__", $servers) }
        if ($text -match "can't find.*Server failed") { return @("__FAILED__", $servers) }
        if ($servers.Count -gt 0) { return @("__OK__", $servers) }
        # 兼容 nslookup 其他输出格式
        $lines = $text -split "`r?`n"
        foreach ($line in $lines) {
            if ($line -match "^(ns[12]\.cloudflare\.com|(christian|whirlwind)\.dnspod\.net)\b") {
                $servers += $Matches[1]
            }
        }
        if ($servers.Count -gt 0) { return @("__OK__", $servers) }
        return @("__UNKNOWN__", $servers)
    }

    function Parse-A($text) {
        $ips = @()
        $lines = $text -split "`r?`n"
        foreach ($line in $lines) {
            if ($line -match "^Address(?:es)?\s*:\s*(.+)$") {
                $rest = $Matches[1].Trim()
                foreach ($tok in ($rest -split ",|`r?`n")) {
                    $t = $tok.Trim()
                    if ($t -match "^\d{1,3}(\.\d{1,3}){3}$") { $ips += $t }
                }
            }
        }
        # 另一种格式: 直接找 Address:  IP  非 DNS 服务器的
        $addressMatches = [regex]::Matches($text, "(?m)^\s*Address(?:es)?\s*:\s*([^\r\n]+)")
        foreach ($m in $addressMatches) {
            $val = $m.Groups[1].Value.Trim()
            if ($val -match "^\d{1,3}(\.\d{1,3}){3}$" -and $val -ne "8.8.8.8" -and $val -ne "1.1.1.1" -and $val -ne "119.29.29.29") {
                if ($ips -notcontains $val) { $ips += $val }
            }
        }
        if ($text -match "Server failed" -or $text -match "can't find.*Server failed") { return @("__FAILED__", $ips) }
        if ($ips.Count -gt 0) { return @("__OK__", $ips) }
        return @("__UNKNOWN__", $ips)
    }

    function Parse-Curl($text) {
        if ($text -match "Could not resolve host") { return @("__NO_DNS__", $null) }
        if ($text -match "Connection timed out") { return @("__TIMEOUT__", $null) }
        if ($text -match "HTTP/(?:1\.1|2|3)\s+(\d{3})") { return @("__OK__", [int]$Matches[1]) }
        return @("__UNKNOWN__", $null)
    }

    $ns8Stat, $ns8Srv = Parse-NS $ns8
    $ns1Stat, $ns1Srv = Parse-NS $ns1
    $ns119Stat, $ns119Srv = Parse-NS $ns119
    $a8Stat, $a8Ips   = Parse-A  $a8
    $curlStat, $curlCode = Parse-Curl $curlOut

    # ---------- 判断是否生效 ----------
    $allNS = @($ns8Srv + $ns1Srv + $ns119Srv) | Where-Object { $_ -and $_ -ne "" } | Select-Object -Unique
    $allA  = @($a8Ips) | Where-Object { $_ -and $_ -ne "" } | Select-Object -Unique

    $hasCloudflareNS = ($allNS -contains "ns1.cloudflare.com") -and ($allNS -contains "ns2.cloudflare.com")
    $hasDNSPodNS     = ($allNS -match "dnspod\.net").Count -gt 0
    $hasVercelA      = ($allA -contains "76.76.21.21")
    $hasOldA         = ($allA -contains "119.28.189.98")

    $effective = $hasCloudflareNS -and $hasVercelA

    # ---------- 如果生效，额外测试 HTTP 200 ----------
    $http200Ok = $false
    $httpDetail = ""
    if ($effective) {
        $httpTest = Invoke-Cmd "curl -I -k --max-time 15 https://$Domain 2>&1"
        if ($httpTest -match "HTTP/(?:1\.1|2|3)\s+(\d{3})") {
            $code = [int]$Matches[1]
            $httpDetail = "HTTP $code"
            $http200Ok = ($code -eq 200)
        } else {
            $httpDetail = "无法解析响应: $($httpTest -split "`r?`n" | Select-Object -First 3)"
        }
    }

    # ---------- 构建日志 ----------
    function Format-NSRow($stat, $srvs, $name) {
        if ($stat -eq "__FAILED__") { return "| $name | Server failed | — |" }
        if ($stat -eq "__OK__" -and $srvs.Count -gt 0) { return "| $name | 解析成功 | ``$($srvs -join '``, ``')`` |" }
        return "| $name | 结果未知 | — |"
    }
    function Format-ARow($stat, $ips, $name) {
        if ($stat -eq "__FAILED__") { return "| $name | Server failed / 超时 | — |" }
        if ($stat -eq "__OK__" -and $ips.Count -gt 0) { return "| $name | 解析成功 | ``$($ips -join '``, ``')`` |" }
        return "| $name | 结果未知 | — |"
    }

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine()
    if ($effective) {
        [void]$sb.AppendLine("[SUCCESS] DNS 已生效")
        [void]$sb.AppendLine()
    }
    [void]$sb.AppendLine("## 检查 #$checkNo — $ts")
    [void]$sb.AppendLine()
    if ($effective) {
        [void]$sb.AppendLine("**状态：✅ 已生效（Cloudflare NS + Vercel A 记录）**")
    } elseif ($hasCloudflareNS -and -not $hasVercelA) {
        [void]$sb.AppendLine("**状态：⚠️ 部分生效（Cloudflare NS 已传播，A 记录未指向 Vercel）**")
    } else {
        [void]$sb.AppendLine("**状态：❌ 未生效**")
    }
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("### NS 记录查询")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("| DNS 服务器 | 结果 | NS 记录 |")
    [void]$sb.AppendLine("|---|---|---|")
    [void]$sb.AppendLine((Format-NSRow $ns8Stat   $ns8Srv   "8.8.8.8 (Google)"))
    [void]$sb.AppendLine((Format-NSRow $ns1Stat   $ns1Srv   "1.1.1.1 (Cloudflare)"))
    [void]$sb.AppendLine((Format-NSRow $ns119Stat $ns119Srv "119.29.29.29 (DNSPod)"))
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("### A 记录查询")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("| DNS 服务器 | 结果 | IP 地址 |")
    [void]$sb.AppendLine("|---|---|---|")
    [void]$sb.AppendLine((Format-ARow $a8Stat $a8Ips "8.8.8.8 (Google)"))
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("### HTTPS 可达性测试")
    [void]$sb.AppendLine()
    if ($curlStat -eq "__NO_DNS__") {
        [void]$sb.AppendLine("- ``curl -I -k --max-time 10 https://$Domain`` → **失败**：``Could not resolve host: $Domain``")
    } elseif ($curlStat -eq "__TIMEOUT__") {
        [void]$sb.AppendLine("- ``curl -I -k --max-time 10 https://$Domain`` → **失败**：``Connection timed out``")
    } elseif ($curlStat -eq "__OK__") {
        [void]$sb.AppendLine("- ``curl -I -k --max-time 10 https://$Domain`` → **响应 HTTP $curlCode**")
    } else {
        [void]$sb.AppendLine("- ``curl -I -k --max-time 10 https://$Domain`` → **结果未知**")
    }
    [void]$sb.AppendLine()
    if ($effective) {
        [void]$sb.AppendLine("### 额外 HTTPS 访问测试（DNS 已生效后执行）")
        [void]$sb.AppendLine()
        if ($http200Ok) {
            [void]$sb.AppendLine("- $httpDetail — ✅ **可正常访问** (HTTP 200)")
        } else {
            [void]$sb.AppendLine("- $httpDetail — ⚠️ **注意**: 非 200 响应，需进一步检查 Vercel 部署与 SSL 证书签发状态")
        }
        [void]$sb.AppendLine()
    }
    [void]$sb.AppendLine("### 关键结论")
    [void]$sb.AppendLine()
    if ($effective) {
        [void]$sb.AppendLine("- NS 记录 **已切换到 Cloudflare**：``ns1.cloudflare.com`` / ``ns2.cloudflare.com``")
        [void]$sb.AppendLine("- A 记录 **已指向 Vercel IP**：``76.76.21.21``")
        if ($http200Ok) {
            [void]$sb.AppendLine("- HTTPS ``https://$Domain`` **可正常访问 (HTTP 200)**")
        } else {
            [void]$sb.AppendLine("- HTTPS 测试结果: $httpDetail")
        }
    } else {
        if ($hasCloudflareNS) { [void]$sb.AppendLine("- NS 记录 **已出现 Cloudflare**：``$($allNS -join ', ')``") }
        if ($hasDNSPodNS)     { [void]$sb.AppendLine("- NS 记录 **仍包含 DNSPod**：``$($allNS -join ', ')``") }
        if (-not $hasCloudflareNS -and -not $hasDNSPodNS) { [void]$sb.AppendLine("- NS 记录 **未解析到结果**，处于切换黑洞期") }
        if ($hasVercelA)      { [void]$sb.AppendLine("- A 记录 **已出现 Vercel IP**: ``$($allA -join ', ')``") }
        if ($hasOldA)         { [void]$sb.AppendLine("- A 记录 **仍包含旧 IP**: ``$($allA -join ', ')``") }
        if (-not $hasVercelA -and -not $hasOldA) { [void]$sb.AppendLine("- A 记录 **未解析到结果**") }
    }
    if (-not $effective) {
        [void]$sb.AppendLine("- **连续未生效次数：$checkNo / 6**")
    }
    if ($checkNo -eq $EndCheckNo -and -not $effective) {
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("[WARNING] DNS 传播较慢，建议检查腾讯云注册局状态")
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("- 已达最大检查次数（6 次 / 约 1 小时）")
        [void]$sb.AppendLine("- 如多次检查仍未传播，请登录腾讯云域名控制台确认 lifeassert.online 的 DNS 服务器是否已正确修改为 Cloudflare 的两个 NS")
        [void]$sb.AppendLine("- 如已修改但仍不生效，可能需要联系注册局支持或等待更长时间（部分 TLD 最长 48 小时）")
    }
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("---")

    # 写入日志
    Add-Content -Path $LogFile -Value "`r`n"
    Add-Content -Path $LogFile -Value $sb.ToString() -Encoding UTF8

    return $effective
}

# ---------- 主循环 ----------
for ($i = $StartCheckNo; $i -le $EndCheckNo; $i++) {
    # 等待间隔（首轮也等，因为上次检查刚完成不久）
    Start-Sleep -Seconds $IntervalSec

    $ok = Run-Check $i

    if ($ok) {
        # 成功即退出，不继续后续检查
        Write-Host "[SUCCESS] DNS 已生效 (检查 #$i)，日志已写入"
        exit 0
    }

    Write-Host "检查 #$i 完成，DNS 尚未生效。下一轮检查将于 $($IntervalSec/60) 分钟后执行..."
}

Write-Host "[WARNING] 已完成 6 次检查，DNS 仍未生效。详见日志文件。"
exit 1
