export const publish2channel = /* GraphQL */ `
  mutation Publish2channel($data: AWSJSON!, $name: String!) {
    publish2channel(data: $data, name: $name) {
      data
      name
      __typename
    }
  }
`;
