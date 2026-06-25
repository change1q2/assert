const fmtDt = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export { fmtDt };
