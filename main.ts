async function loadFromHKO(year: number) {
  const res = await fetch(
    `https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T${year}c.txt`,
  );
  const text = await res.arrayBuffer().then((buffer) =>
    new TextDecoder("big5").decode(buffer)
  );
  return text;
}

async function loadData(fromYear: number, toYear: number) {
  const data = [];
  for (let year = fromYear; year <= toYear; year++) {
    const file = `files/T${year}c.txt`;
    const text = await Deno.readTextFile(file).catch(() => undefined);
    if (text) {
      data.push(text);
    } else {
      const text2 = await loadFromHKO(year);
      await Deno.writeTextFile(file, text2);
      console.log(year, text2.substring(0, 50));
      data.push(text2);
    }
  }
  return data;
}

type Day = {
  year: string;
  month: string;
  day: string;
  term: string;
};

async function main() {
  const data = await loadData(1901, 2100);
  const days = data.map((text) =>
    text.split("\n").splice(3).filter(Boolean).map((line) => {
      const cells = line.split(/\s+/).filter(Boolean);
      if (cells.length == 4) {
        const ymd = cells[0].match(/\d+/g);
        return {
          year: ymd![0],
          month: ymd![1],
          day: ymd![2],
          term: cells[3],
        };
      }
    }).filter(Boolean)
  ).flat() as Day[];

  const ical = generate_ical(days);
  await Deno.writeTextFile("dist/24solarterms.ics", ical);
}

function getDayString(year: string, month: string, day: string) {
  const d = new Date(`${year}-${month}-${day}`);
  return d.toISOString().split("T")[0].replaceAll("-", "");
}

function nextDayString(year: string, month: string, day: string) {
  const d = new Date(`${year}-${month}-${day}`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0].replaceAll("-", "");
}

function generate_ical(days: Day[]) {
  const DTSTAMP = `${
    new Date().toISOString().substring(0, 19).replaceAll(":", "").replaceAll(
      "-",
      "",
    )
  }Z`;
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//tsangpo//Chinese 24 Solar Terms//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:二十四節氣
X-WR-TIMEZONE:Asia/Shanghai
X-WR-CALDESC:中国二十四節氣 1901-2100. 数据来自香港天文台
${
    days.map((d) => `
BEGIN:VEVENT
DTSTAMP:${DTSTAMP}
UID:${getDayString(d.year, d.month, d.day)}-24st@tsangpo.github.io
DTSTART;VALUE=DATE:${getDayString(d.year, d.month, d.day)}
DTEND;VALUE=DATE:${nextDayString(d.year, d.month, d.day)}
STATUS:CONFIRMED
SUMMARY:${d.term}
END:VEVENT
`).join("")
  }
END:VCALENDAR
`;
}

main();
