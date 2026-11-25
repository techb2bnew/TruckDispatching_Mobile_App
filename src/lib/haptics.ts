import { trigger } from 'react-native-haptic-feedback';

// Same API surface as expo-haptics so screens stay unchanged.
export enum ImpactFeedbackStyle { Light = 'impactLight', Medium = 'impactMedium', Heavy = 'impactHeavy' }
export enum NotificationFeedbackType { Success = 'notificationSuccess', Warning = 'notificationWarning', Error = 'notificationError' }

export const selectionAsync = async () => trigger('selection');
export const impactAsync = async (style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium) => trigger(style);
export const notificationAsync = async (type: NotificationFeedbackType = NotificationFeedbackType.Success) => trigger(type);
