import React, { useEffect } from "react"
import { collection, getFirestore, onSnapshot } from "firebase/firestore"
import {
  BooleanInput,
  Create,
  Datagrid,
  DateField,
  DateInput,
  Edit,
  EditButton,
  List,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  useRefresh
} from "react-admin"

const typeChoices = [
  { id: "article", name: "Article" },
  { id: "award", name: "Award" },
  { id: "book", name: "Book" }
]

/* The format filters on the In the News page (NewsFormat in components/db). */
const formatChoices = [
  { id: "news", name: "News" },
  { id: "opinion", name: "Opinion" },
  { id: "research", name: "Research" },
  { id: "interview", name: "Podcast or interview" }
]

export function ListNews() {
  const firestore = getFirestore()
  const refresh = useRefresh()

  useEffect(() => {
    const newsRef = collection(firestore, "news")
    const unsubscribe = onSnapshot(
      newsRef,
      () => refresh(),
      (e: Error) => console.log(e)
    )

    return () => unsubscribe()
  }, [firestore, refresh])

  return (
    <List>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="id" label="News ID" />
        <TextField source="title" label="Title" />
        <TextField source="author" label="Author" />
        <TextField source="type" label="Type" />
        <TextField source="format" label="Format" />
        <DateField source="publishDate" label="Publish Date" />
        <DateField source="createdAt" showTime />
        <EditButton label="Edit" />
      </Datagrid>
    </List>
  )
}

/* The fields shared by the edit and create forms. */
const NewsFields = () => (
  <>
    <TextInput source="url" fullWidth />
    <SelectInput source="type" choices={typeChoices} />
    <SelectInput
      source="format"
      choices={formatChoices}
      helperText="Sorts the piece under a filter on the In the News page."
    />
    <TextInput source="author" label="Outlet" />
    <TextInput source="title" fullWidth />
    <TextInput source="description" multiline fullWidth />
    <DateInput source="publishDate" />
    <TextInput
      source="excerpt"
      multiline
      fullWidth
      helperText="Optional. A short quote from the piece, word for word, with its quotation marks. Shown under Selected excerpts."
    />
    <TextInput
      source="byline"
      helperText="Optional. Who wrote the piece, shown with its excerpt."
    />
    <BooleanInput
      source="featured"
      label="Name this outlet in the Featured in line"
    />
  </>
)

export function EditNews() {
  return (
    <Edit>
      <SimpleForm>
        <NewsFields />
      </SimpleForm>
    </Edit>
  )
}

export function CreateNews() {
  return (
    <Create
      redirect="list"
      transform={(data: Record<string, unknown>) => ({
        ...data,
        createdAt: new Date()
      })}
    >
      <SimpleForm>
        <NewsFields />
      </SimpleForm>
    </Create>
  )
}

export default { ListNews, EditNews, CreateNews }
