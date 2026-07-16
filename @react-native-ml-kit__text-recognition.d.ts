declare module '@react-native-ml-kit/text-recognition' {
  export interface TextRecognitionResult {
    text: string;
    [key: string]: any;
  }

  const TextRecognition: {
    recognize: (uri: string) => Promise<TextRecognitionResult>;
  };

  export default TextRecognition;
}
