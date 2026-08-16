export interface TrainingGroup {
  value: string;
  label: string;
  schedule: string | null;
  age?: string;
  title?: string;
  description?: string;
}

export const TRAINING_GROUPS: TrainingGroup[] = [
  {
    value: "2016–2014 m. mišri pradedančiųjų grupė",
    label: "2014–2016 m. mišri pradedančiųjų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 16:00–17:00",
    age: "2014–2016 m.",
    title: "Mišri pradedančiųjų grupė",
    description:
      "Pirmoji pažintis su tinkliniu per žaidimus, koordinacijos ir kamuolio valdymo pratimus.",
  },
  {
    value: "2014–2012 m. mergaičių pradedančiųjų / lengvai pažengusiųjų grupė",
    label: "2012–2014 m. mergaičių pradedančiųjų / lengvai pažengusiųjų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 17:00–18:00",
    age: "2012–2014 m.",
    title: "Mergaičių pradedančiųjų / lengvai pažengusiųjų grupė",
    description: "Technikos pagrindai ir komandinio žaidimo įgūdžiai.",
  },
  {
    value: "2012–2008 m. pažengusiųjų vaikinų grupė",
    label: "2008–2012 m. pažengusiųjų vaikinų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 18:00–19:00",
    age: "2008–2012 m.",
    title: "Pažengusiųjų vaikinų grupė",
    description:
      "Intensyvios treniruotės sportininkams, siekiantiems aukštesnio meistriškumo.",
  },
  {
    value: "2012–2008 m. lengvai pažengusiųjų merginų grupė",
    label: "2008–2012 m. lengvai pažengusiųjų merginų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 19:00–20:00",
    age: "2008–2012 m.",
    title: "Lengvai pažengusiųjų merginų grupė",
    description: "Technikos, taktikos ir fizinio pasirengimo tobulinimas.",
  },
  {
    value: "Nežinau – padėkite parinkti tinkamiausią grupę",
    label: "Nežinau – padėkite parinkti tinkamiausią grupę",
    schedule: null,
  },
];

export const TRAINING_GROUP_OPTIONS = TRAINING_GROUPS.map(({ value, label }) => ({
  value,
  label,
}));

export const HOMEPAGE_TRAINING_GROUPS = TRAINING_GROUPS.filter(
  (group) => group.schedule !== null
);

export function getTrainingGroupSchedule(trainingGroup: string): string | null {
  return TRAINING_GROUPS.find((group) => group.value === trainingGroup)?.schedule ?? null;
}

export function getPreferredTrainingTimes(trainingGroup: string): string | null {
  return getTrainingGroupSchedule(trainingGroup);
}

export function formatTrainingGroupScheduleDisplay(schedule: string): string {
  const match = schedule.match(/^(.+)\s(\d{2}:\d{2}–\d{2}:\d{2})$/);
  if (match) {
    return `${match[1]} • ${match[2]}`;
  }
  return schedule;
}

export function formatTrainingGroupDisplay(trainingGroup: string | null | undefined): string {
  if (!trainingGroup) return "—";
  const group = TRAINING_GROUPS.find((entry) => entry.value === trainingGroup);
  return group?.label ?? trainingGroup;
}

export function formatTrainingGroupOptionLabel(group: TrainingGroup): string {
  if (!group.schedule) {
    return group.label;
  }

  return `${group.label} (${formatTrainingGroupScheduleDisplay(group.schedule)})`;
}
