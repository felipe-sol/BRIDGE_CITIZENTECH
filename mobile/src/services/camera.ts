/**
 * Recurso nativo: câmera (e galeria como alternativa), via expo-image-picker.
 *
 * Política de permissão:
 * - Só pede permissão quando o usuário toca em "Tirar foto".
 * - Se o sistema não permite perguntar de novo (canAskAgain = false), não insiste:
 *   a tela explica e oferece abrir as Configurações.
 */
import * as ImagePicker from 'expo-image-picker';

export interface FotoSelecionada {
  uri: string;
  largura: number;
  altura: number;
  tipoMime: string | null;
  tamanhoBytes: number | null;
}

export type ResultadoFoto =
  | { tipo: 'foto'; foto: FotoSelecionada }
  | { tipo: 'cancelado' }
  | { tipo: 'sem_permissao'; podePerguntarDeNovo: boolean }
  | { tipo: 'erro'; mensagem: string };

const OPCOES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7, // comprime em JPEG e mantém a foto abaixo do limite de 5 MB
  allowsEditing: false,
  exif: false, // não lemos metadados (podem conter GPS); o servidor também os remove
};

function converter(resultado: ImagePicker.ImagePickerResult): ResultadoFoto {
  if (resultado.canceled) return { tipo: 'cancelado' };
  const asset = resultado.assets[0];
  if (asset === undefined) return { tipo: 'cancelado' };
  return {
    tipo: 'foto',
    foto: {
      uri: asset.uri,
      largura: asset.width,
      altura: asset.height,
      tipoMime: asset.mimeType ?? null,
      tamanhoBytes: asset.fileSize ?? null,
    },
  };
}

export async function tirarFoto(): Promise<ResultadoFoto> {
  try {
    let permissao = await ImagePicker.getCameraPermissionsAsync();
    if (!permissao.granted) {
      if (!permissao.canAskAgain) return { tipo: 'sem_permissao', podePerguntarDeNovo: false };
      permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) return { tipo: 'sem_permissao', podePerguntarDeNovo: permissao.canAskAgain };
    }
    return converter(await ImagePicker.launchCameraAsync(OPCOES));
  } catch {
    return { tipo: 'erro', mensagem: 'Não foi possível abrir a câmera neste aparelho. Tente escolher uma foto da galeria.' };
  }
}

/** A galeria do sistema não exige permissão prévia (seletor de fotos do sistema). */
export async function escolherDaGaleria(): Promise<ResultadoFoto> {
  try {
    return converter(await ImagePicker.launchImageLibraryAsync(OPCOES));
  } catch {
    return { tipo: 'erro', mensagem: 'Não foi possível abrir a galeria de fotos.' };
  }
}
