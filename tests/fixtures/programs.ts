export const exerciseCatalogFixture = [
  { id: 10, name: 'Жим лёжа' },
  { id: 20, name: 'Тяга верхнего блока' },
  { id: 30, name: 'Приседания' },
]

export const programsFixture = [
  {
    id: 30,
    weekday: 5,
    name: 'Ноги',
    exercises: [
      {
        exercise_id: 30,
        position: 1,
        sets: [{ position: 1, repetitions: 8, working_weight_kg: 100 }],
      },
    ],
  },
  {
    id: 10,
    weekday: 1,
    name: 'Грудь и трицепс',
    exercises: [
      {
        exercise_id: 10,
        position: 1,
        sets: [
          { position: 1, repetitions: 6, working_weight_kg: 100 },
          { position: 2, repetitions: 6, working_weight_kg: 100 },
          { position: 3, repetitions: 3, working_weight_kg: 140 },
        ],
      },
    ],
  },
  {
    id: 20,
    weekday: 2,
    name: 'Спина и бицепс',
    exercises: [
      {
        exercise_id: 20,
        position: 1,
        sets: [{ position: 1, repetitions: 10, working_weight_kg: 60 }],
      },
    ],
  },
]
