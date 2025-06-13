export interface PhotoFields {
  photo1: {
    file: File
    preview: string
  }
  photo2: {
    file: File
    preview: string
  }
  photo3: {
    file: File
    preview: string
  }
}

export interface ChecklistPhotos {
  [key: string]: {
    file: File
    preview: string
  }
} 